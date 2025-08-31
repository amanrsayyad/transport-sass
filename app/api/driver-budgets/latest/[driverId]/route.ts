import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverBudget from '@/models/DriverBudget';

// GET - Fetch latest driver budget for a specific driver
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  try {
    await connectDB();
    
    const { driverId } = await params;
    
    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }
    
    // Find the latest budget for the driver
    const latestBudget = await DriverBudget.findOne({ driverId })
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('driverId', 'name licenseNumber')
      .sort({ createdAt: -1 });
    
    if (!latestBudget) {
      return NextResponse.json(
        { error: 'No budget found for this driver' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      ...latestBudget.toObject(),
      budgetAmount: latestBudget.dailyBudgetAmount,
      remainingBudgetAmount: latestBudget.remainingBudgetAmount || 0
    });
  } catch (error) {
    console.error('Error fetching latest driver budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest driver budget' },
      { status: 500 }
    );
  }
}