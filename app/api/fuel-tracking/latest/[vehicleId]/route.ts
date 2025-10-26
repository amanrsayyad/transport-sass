import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FuelTracking from '@/models/FuelTracking';
import AppUser from '@/models/AppUser';
import Bank from '@/models/Bank';
import Vehicle from '@/models/Vehicle';

// GET - Fetch latest fuel tracking record for a specific vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  let vehicleId: string | undefined;
  
  try {
    await connectDB();
    
    const resolvedParams = await params;
    vehicleId = resolvedParams?.vehicleId;
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Validate vehicleId format (should be a valid ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(vehicleId)) {
      return NextResponse.json(
        { error: 'Invalid vehicle ID format' },
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
    console.error('Error fetching latest fuel tracking record:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      vehicleId: vehicleId || 'unknown'
    });
    return NextResponse.json(
      { error: 'Failed to fetch latest fuel tracking record' },
      { status: 500 }
    );
  }
}