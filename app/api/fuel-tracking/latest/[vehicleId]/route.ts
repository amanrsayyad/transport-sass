import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FuelTracking from '@/models/FuelTracking';

// GET - Fetch latest fuel tracking record for a specific vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    await connectDB();
    
    const { vehicleId } = await params;
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Find the latest fuel tracking record for the vehicle
    const latestFuelRecord = await FuelTracking.findOne({ vehicleId })
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('vehicleId', 'registrationNumber vehicleType vehicleWeight vehicleStatus')
      .sort({ createdAt: -1 });
    
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
    console.error('Error fetching latest fuel tracking record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest fuel tracking record' },
      { status: 500 }
    );
  }
}