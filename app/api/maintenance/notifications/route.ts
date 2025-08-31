import { NextRequest, NextResponse } from 'next/server';
import connectDB from "@/lib/mongodb";
import Maintenance from '@/models/Maintenance';
import Vehicle from '@/models/Vehicle';
import AppUser from '@/models/AppUser';
import Bank from '@/models/Bank';

// GET - Fetch due maintenance notifications
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const appUserId = searchParams.get('appUserId');
    
    let query: any = {
      $or: [
        {
          status: { $in: ['Due', 'Overdue'] },
          isCompleted: false,
          isNotificationSent: true
        },
        {
          status: 'Pending',
          notificationStatus: 'Declined',
          isCompleted: false
        }
      ]
    };
    
    if (appUserId) {
      query.appUserId = appUserId;
    }
    
    const dueMaintenanceRecords = await Maintenance.find(query)
      .populate('appUserId', 'name')
      .populate('vehicleId', 'vehicleNumber')
      .populate('bankId', 'bankName')
      .sort({ totalKm: -1 }); // Show most overdue first
    
    return NextResponse.json(dueMaintenanceRecords);
  } catch (error) {
    console.error('Error fetching maintenance notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance notifications' },
      { status: 500 }
    );
  }
}