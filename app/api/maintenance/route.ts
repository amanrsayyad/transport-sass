import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Maintenance from '@/models/Maintenance';
import Trip from '@/models/Trip';
import Bank from '@/models/Bank';
import Expense from '@/models/Expense';
import Transaction from '@/models/Transaction';

// GET - Fetch maintenance records
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const appUserId = searchParams.get('appUserId');
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    
    let query: any = {};
    if (appUserId) query.appUserId = appUserId;
    if (vehicleId) query.vehicleId = vehicleId;
    if (status) query.status = status;
    
    const maintenanceRecords = await Maintenance.find(query)
      .populate('appUserId', 'name')
      .populate('vehicleId', 'vehicleNumber')
      .populate('bankId', 'bankName')
      .populate('mechanicId', 'name phone')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(maintenanceRecords);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}

// POST - Create maintenance record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('Received maintenance data:', body);
    
    const { appUserId, bankId, vehicleId, mechanicId, category, categoryAmount, targetKm, startKm, endKm, bankName, vehicleNumber, createdBy } = body;
    
    // Validate required fields
    if (!appUserId || !bankId || !vehicleId || !category || !categoryAmount || !targetKm) {
      console.error('Missing required fields:', { appUserId, bankId, vehicleId, category, categoryAmount, targetKm });
      return NextResponse.json(
        { error: 'Missing required fields: appUserId, bankId, vehicleId, category, categoryAmount, targetKm are required' },
        { status: 400 }
      );
    }
    
    if (categoryAmount <= 0) {
      return NextResponse.json(
        { error: 'Category amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (targetKm <= 0) {
      return NextResponse.json(
        { error: 'Target KM must be greater than 0' },
        { status: 400 }
      );
    }
    
    // Verify that the bank exists and has sufficient balance
    const bank = await Bank.findById(bankId);
    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }
    
    // Calculate total km
    const calculatedStartKm = startKm || 0;
    const calculatedEndKm = endKm || calculatedStartKm;
    const totalKm = calculatedEndKm - calculatedStartKm;
    
    // Determine status based on total km vs target km
    let status = 'Pending';
    if (totalKm >= targetKm) {
      status = 'Due';
    }
    
    // Handle createdBy field - ensure it's a valid ObjectId
    let finalCreatedBy = createdBy || appUserId;
    console.log('Using createdBy:', finalCreatedBy);
    
    // Create maintenance record
    const maintenanceData = {
      appUserId,
      bankId,
      bankName: bankName || bank.bankName,
      vehicleId,
      vehicleNumber: vehicleNumber || '',
      mechanicId: mechanicId && mechanicId !== 'none' ? mechanicId : undefined,
      category,
      categoryAmount,
      startKm: calculatedStartKm,
      targetKm,
      endKm: calculatedEndKm,
      totalKm,
      status,
      isNotificationSent: false,
      isCompleted: false,
      createdBy: finalCreatedBy
    };
    
    console.log('Creating maintenance record with data:', maintenanceData);
    
    const maintenance = await Maintenance.create(maintenanceData);
    console.log('Maintenance record created successfully:', maintenance._id);
    
    // Populate the created record for response
    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate('appUserId', 'name')
      .populate('vehicleId', 'vehicleNumber')
      .populate('bankId', 'bankName')
      .populate({
        path: 'mechanicId',
        select: 'name phone',
        match: { _id: { $exists: true } }
      });
    
    return NextResponse.json(populatedMaintenance, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create maintenance record', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update maintenance records (for km tracking)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { vehicleId } = body;
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Get latest trip for the vehicle
    const latestTrip = await Trip.findOne({ vehicleId })
      .sort({ createdAt: -1 });
    
    if (!latestTrip) {
      return NextResponse.json({ message: 'No trips found for vehicle' });
    }
    
    // Update all pending maintenance records for this vehicle
    const pendingMaintenance = await Maintenance.find({
      vehicleId,
      status: { $in: ['Pending', 'Due'] }
    });
    
    const updatedRecords = [];
    
    for (const maintenance of pendingMaintenance) {
      const newEndKm = latestTrip.endKm || 0;
      const newTotalKm = newEndKm - maintenance.startKm;
      
      let newStatus = maintenance.status;
      
      // Check if maintenance is due
      if (newTotalKm >= maintenance.targetKm) {
        newStatus = 'Due';
      } else if (newTotalKm > maintenance.targetKm * 1.1) { // 10% overdue
        newStatus = 'Overdue';
      }
      
      const updated = await Maintenance.findByIdAndUpdate(
        maintenance._id,
        {
          endKm: newEndKm,
          totalKm: newTotalKm,
          status: newStatus
        },
        { new: true }
      );
      
      updatedRecords.push(updated);
    }
    
    return NextResponse.json(updatedRecords);
  } catch (error) {
    console.error('Error updating maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance records' },
      { status: 500 }
    );
  }
}