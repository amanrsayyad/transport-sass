import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Trip from '@/models/Trip';

// GET - Fetch latest trip record for a specific vehicle
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
    
    // Find the latest trip for this vehicle
    const latestTrip = await Trip.findOne({ vehicleId })
      .sort({ createdAt: -1 })
      .select('endKm vehicleId tripId createdAt');
    
    if (!latestTrip) {
      return NextResponse.json(
        { error: 'No trip records found for this vehicle' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(latestTrip);
  } catch (error) {
    console.error('Error fetching latest trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest trip' },
      { status: 500 }
    );
  }
}