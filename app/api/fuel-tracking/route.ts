import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FuelTracking from '@/models/FuelTracking';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';
import Vehicle from '@/models/Vehicle';

// GET - Fetch fuel tracking records with optional filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const latest = searchParams.get('latest');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    let query = {};
    if (vehicleId) {
      query = { vehicleId };
    }
    
    // If requesting latest record for a specific vehicle
    if (vehicleId && latest === 'true') {
      const fuelRecords = await FuelTracking.find(query)
        .populate('appUserId', 'name email')
        .populate('bankId', 'bankName accountNumber')
        .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus')
        .sort({ createdAt: -1 })
        .limit(1);
        
      if (fuelRecords.length > 0) {
        const latestRecord = fuelRecords[0];
        return NextResponse.json({
          ...latestRecord.toObject(),
          mileage: latestRecord.truckAverage
        });
      }
    }
    
    // Get total count for pagination
    const total = await FuelTracking.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get paginated results
    const fuelRecords = await FuelTracking.find(query)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return NextResponse.json({
      data: fuelRecords,
      page,
      limit,
      total,
      pages
    });
  } catch (error) {
    console.error('Error fetching fuel tracking records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fuel tracking records' },
      { status: 500 }
    );
  }
}

// POST - Create a new fuel tracking record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      appUserId, 
      bankId, 
      vehicleId, 
      startKm, 
      endKm, 
      fuelQuantity, 
      fuelRate, 
      description, 
      date,
      paymentType 
    } = body;

    // Validate required fields
    if (!appUserId || !bankId || !vehicleId || startKm === undefined || 
        endKm === undefined || !fuelQuantity || !fuelRate || !date || !paymentType) {
      return NextResponse.json(
        { error: 'All fields are required: appUserId, bankId, vehicleId, startKm, endKm, fuelQuantity, fuelRate, date, and paymentType' },
        { status: 400 }
      );
    }

    if (endKm <= startKm) {
      return NextResponse.json(
        { error: 'End KM must be greater than start KM' },
        { status: 400 }
      );
    }

    if (fuelQuantity <= 0 || fuelRate <= 0) {
      return NextResponse.json(
        { error: 'Fuel quantity and rate must be greater than 0' },
        { status: 400 }
      );
    }

    // Get previous fuel record for carry-forward logic
    const previousFuelRecord = await FuelTracking.findOne({ vehicleId })
      .sort({ createdAt: -1 });
    
    let carryForwardFuel = 0;
    if (previousFuelRecord && previousFuelRecord.remainingFuelQuantity > 0) {
      carryForwardFuel = previousFuelRecord.remainingFuelQuantity;
      console.log(`Carrying forward ${carryForwardFuel}L of fuel from previous record`);
    }
    
    // Calculate total fuel quantity including carry-forward
    const totalFuelQuantity = fuelQuantity + carryForwardFuel;
    
    // Calculate total amount and truck average
    const totalAmount = fuelQuantity * fuelRate;
    const distanceTraveled = endKm - startKm;
    const truckAverage = distanceTraveled / totalFuelQuantity; // KM per liter using total fuel

    // Verify app user, bank, and vehicle exist
    const [appUser, bank, vehicle] = await Promise.all([
      AppUser.findById(appUserId),
      Bank.findById(bankId),
      Vehicle.findById(vehicleId)
    ]);

    if (!appUser) {
      return NextResponse.json(
        { error: 'App user not found' },
        { status: 404 }
      );
    }

    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if bank has sufficient balance
    if (bank.balance < totalAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance in bank account' },
        { status: 400 }
      );
    }

    // Create fuel tracking record
    const fuelTracking = new FuelTracking({
      appUserId,
      bankId,
      vehicleId,
      startKm,
      endKm,
      fuelQuantity,
      remainingFuelQuantity: totalFuelQuantity, // Set initial remaining fuel to total fuel
      fuelRate,
      totalAmount,
      truckAverage,
      description,
      date: new Date(date),
      paymentType,
    });

    await fuelTracking.save();
    
    // Update previous fuel record to clear remaining fuel (carry-forward completed)
    if (previousFuelRecord && carryForwardFuel > 0) {
      console.log(`Updating previous fuel record ${previousFuelRecord._id} to set remainingFuelQuantity to 0`);
      await FuelTracking.findByIdAndUpdate(previousFuelRecord._id, {
        remainingFuelQuantity: 0
      });
    }

    // Update bank balance
    await Bank.findByIdAndUpdate(bankId, {
      $inc: { balance: -totalAmount }
    });

    // Get updated bank balance
    const updatedBank = await Bank.findById(bankId);

    // Create transaction record
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = new Transaction({
      transactionId,
      type: 'FUEL',
      description: description || `Fuel for ${vehicle.registrationNumber} - ${fuelQuantity}L`,
      amount: totalAmount,
      fromBankId: bankId,
      appUserId,
      relatedEntityId: fuelTracking._id,
      relatedEntityType: 'FuelTracking',
      category: 'Fuel Expense',
      balanceAfter: updatedBank?.balance || 0,
      date: new Date(date),
    });

    await transaction.save();

    // Update fuel tracking with transaction ID
    fuelTracking.transactionId = transaction._id;
    await fuelTracking.save();

    const populatedFuelTracking = await FuelTracking.findById(fuelTracking._id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus');

    return NextResponse.json(populatedFuelTracking, { status: 201 });
  } catch (error) {
    console.error('Error creating fuel tracking record:', error);
    return NextResponse.json(
      { error: 'Failed to create fuel tracking record' },
      { status: 500 }
    );
  }
}