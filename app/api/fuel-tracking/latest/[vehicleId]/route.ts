import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FuelTracking from '@/models/FuelTracking';

// GET - Fetch latest fuel tracking record for a specific vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('Extracting vehicleId from params...');
    const { vehicleId } = await params;
    console.log('VehicleId extracted:', vehicleId);
    
    if (!vehicleId) {
      console.log('Vehicle ID is missing');
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Validate vehicleId format (should be a valid ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(vehicleId)) {
      console.log('Invalid vehicleId format:', vehicleId);
      return NextResponse.json(
        { error: 'Invalid vehicle ID format' },
        { status: 400 }
      );
    }
    
    // Find the latest fuel tracking record for the vehicle
    console.log('Querying fuel tracking record for vehicleId:', vehicleId);
    const latestFuelRecord = await FuelTracking.findOne({ vehicleId })
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus')
      .sort({ createdAt: -1 });
    
    console.log('Query completed. Record found:', !!latestFuelRecord);
    
    if (!latestFuelRecord) {
      console.log('No fuel tracking record found for vehicle:', vehicleId);
      return NextResponse.json(
        { error: 'No fuel tracking record found for this vehicle' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      ...latestFuelRecord.toObject(),
      mileage: latestFuelRecord.truckAverage
    });
  } catch (error) {
    console.error('Error fetching latest fuel tracking record:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      vehicleId: vehicleId || 'undefined'
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch latest fuel tracking record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}