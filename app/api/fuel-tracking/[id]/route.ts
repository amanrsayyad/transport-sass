import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FuelTracking from '@/models/FuelTracking';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';
import Vehicle from '@/models/Vehicle';

// GET - Fetch single fuel tracking record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const fuelTracking = await FuelTracking.findById(params.id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus');
    
    if (!fuelTracking) {
      return NextResponse.json(
        { error: 'Fuel tracking record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(fuelTracking);
  } catch (error) {
    console.error('Error fetching fuel tracking record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fuel tracking record' },
      { status: 500 }
    );
  }
}

// PUT - Update fuel tracking record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const existingRecord = await FuelTracking.findById(params.id);
    
    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Fuel tracking record not found' },
        { status: 404 }
      );
    }

    // Validation
    if (body.endKm <= body.startKm) {
      return NextResponse.json(
        { error: 'End KM must be greater than Start KM' },
        { status: 400 }
      );
    }

    if (body.fuelQuantity <= 0 || body.fuelRate <= 0) {
      return NextResponse.json(
        { error: 'Fuel quantity and rate must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify related entities exist
    const [appUser, bank, vehicle] = await Promise.all([
      AppUser.findById(body.appUserId),
      Bank.findById(body.bankId),
      Vehicle.findById(body.vehicleId)
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

    // Calculate derived fields
    const totalAmount = body.fuelQuantity * body.fuelRate;
    const distance = body.endKm - body.startKm;
    const truckAverage = distance / body.fuelQuantity;

    // Check if bank has sufficient balance for the difference
    const amountDifference = totalAmount - existingRecord.totalAmount;
    if (amountDifference > 0 && bank.balance < amountDifference) {
      return NextResponse.json(
        { error: 'Insufficient bank balance for this update' },
        { status: 400 }
      );
    }

    // Handle carry-forward logic if vehicle changed
    let carryForwardFuel = 0;
    if (body.vehicleId !== existingRecord.vehicleId.toString()) {
      // Get previous fuel record for new vehicle
      const previousFuelRecord = await FuelTracking.findOne({
        vehicleId: body.vehicleId,
        createdAt: { $lt: existingRecord.createdAt }
      }).sort({ createdAt: -1 });

      if (previousFuelRecord && previousFuelRecord.remainingFuelQuantity > 0) {
        carryForwardFuel = previousFuelRecord.remainingFuelQuantity;
        // Reset previous record's remaining fuel
        await FuelTracking.findByIdAndUpdate(previousFuelRecord._id, {
          remainingFuelQuantity: 0
        });
      }

      // Restore remaining fuel to old vehicle's previous record
      const oldVehiclePreviousRecord = await FuelTracking.findOne({
        vehicleId: existingRecord.vehicleId,
        createdAt: { $lt: existingRecord.createdAt }
      }).sort({ createdAt: -1 });

      if (oldVehiclePreviousRecord) {
        await FuelTracking.findByIdAndUpdate(oldVehiclePreviousRecord._id, {
          remainingFuelQuantity: existingRecord.fuelQuantity + carryForwardFuel
        });
      }
    }

    const totalFuelQuantity = body.fuelQuantity + carryForwardFuel;

    // Update the fuel tracking record
    const updatedRecord = await FuelTracking.findByIdAndUpdate(
      params.id,
      {
        appUserId: body.appUserId,
        bankId: body.bankId,
        vehicleId: body.vehicleId,
        startKm: body.startKm,
        endKm: body.endKm,
        fuelQuantity: body.fuelQuantity,
        fuelRate: body.fuelRate,
        totalAmount,
        truckAverage,
        date: body.date,
        description: body.description || '',
        paymentType: body.paymentType,
        remainingFuelQuantity: totalFuelQuantity
      },
      { new: true, runValidators: true }
    );

    // Update bank balance
    await Bank.findByIdAndUpdate(body.bankId, {
      $inc: { balance: -amountDifference }
    });

    // Update transaction if it exists
    const existingTransaction = await Transaction.findOne({ fuelTrackingId: params.id });
    if (existingTransaction) {
      await Transaction.findByIdAndUpdate(existingTransaction._id, {
        appUserId: body.appUserId,
        bankId: body.bankId,
        amount: totalAmount,
        description: `Fuel expense for ${vehicle.registrationNumber} - ${body.description || 'Updated'}`,
        date: body.date
      });
    }

    // Populate and return the updated record
    const populatedRecord = await FuelTracking.findById(updatedRecord._id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus');

    return NextResponse.json(populatedRecord);
  } catch (error) {
    console.error('Error updating fuel tracking record:', error);
    return NextResponse.json(
      { error: 'Failed to update fuel tracking record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete fuel tracking record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const fuelRecord = await FuelTracking.findById(params.id);
    
    if (!fuelRecord) {
      return NextResponse.json(
        { error: 'Fuel tracking record not found' },
        { status: 404 }
      );
    }

    // Restore bank balance
    await Bank.findByIdAndUpdate(fuelRecord.bankId, {
      $inc: { balance: fuelRecord.totalAmount }
    });

    // Handle carry-forward restoration
    // Find the previous fuel record for this vehicle
    const previousFuelRecord = await FuelTracking.findOne({
      vehicleId: fuelRecord.vehicleId,
      createdAt: { $lt: fuelRecord.createdAt }
    }).sort({ createdAt: -1 });

    if (previousFuelRecord) {
      // Restore the remaining fuel to the previous record
      await FuelTracking.findByIdAndUpdate(previousFuelRecord._id, {
        remainingFuelQuantity: fuelRecord.remainingFuelQuantity
      });
    }

    // Delete associated transaction
    await Transaction.deleteOne({ fuelTrackingId: params.id });

    // Delete the fuel tracking record
    await FuelTracking.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Fuel tracking record deleted successfully' });
  } catch (error) {
    console.error('Error deleting fuel tracking record:', error);
    return NextResponse.json(
      { error: 'Failed to delete fuel tracking record' },
      { status: 500 }
    );
  }
}