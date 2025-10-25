import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FuelTracking from '@/models/FuelTracking';

// GET - Fetch latest fuel tracking record for a specific vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  let vehicleId: string | undefined;
  
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('Extracting vehicleId from params...');
    const resolvedParams = await params;
    vehicleId = resolvedParams?.vehicleId;
    console.log('VehicleId extracted:', vehicleId);
    
    if (!vehicleId) {
      console.log('No vehicleId provided');
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
    
    console.log('Querying for latest fuel record...');
    // Find the latest fuel tracking record for the vehicle
    const latestFuelRecord = await FuelTracking.findOne({ vehicleId })
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus')
      .sort({ createdAt: -1 });
    
    console.log('Query completed, record found:', !!latestFuelRecord);
    
    if (!latestFuelRecord) {
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
    console.error('Error fetching latest fuel tracking record:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      vehicleId: vehicleId || 'unknown'
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