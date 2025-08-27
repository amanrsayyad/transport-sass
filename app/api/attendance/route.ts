import { NextRequest, NextResponse } from 'next/server';
import connectDB from "@/lib/mongodb";
import Attendance from '@/models/Attendance';
import Driver from '@/models/Driver';

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  try {
    await connectDB();    
    
    // Import Trip model here to avoid circular dependency issues
    const Trip = (await import('@/models/Trip')).default;
    
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build filter object
    const filter: any = {};
    
    if (driverId) {
      filter.driverId = driverId;
    }
    
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      filter.date = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      filter.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    const attendance = await Attendance.find(filter)
      .populate('driverId', 'name')
      .populate('tripId', 'tripId')
      .sort({ date: -1 });
    
    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

  // POST - Create attendance record
  export async function POST(request: NextRequest) {
    try {
      await connectDB();
      
      const body = await request.json();
      
      // Check if attendance already exists for this driver and date
      const existingAttendance = await Attendance.findOne({
        driverId: body.driverId,
        date: new Date(body.date)
      });
      
      if (existingAttendance) {
        return NextResponse.json(
          { error: 'Attendance already exists for this date' },
          { status: 400 }
        );
      }
      
      // Get driver name
      const driver = await Driver.findById(body.driverId);
      if (!driver) {
        return NextResponse.json(
          { error: 'Driver not found' },
          { status: 404 }
        );
      }
      
      const attendance = new Attendance({
        ...body,
        driverName: driver.name,
        date: new Date(body.date)
      });
      
      await attendance.save();
      
      return NextResponse.json(attendance, { status: 201 });
    } catch (error) {
      console.error('Error creating attendance:', error);
      return NextResponse.json(
        { error: 'Failed to create attendance' },
        { status: 500 }
      );
    }
  }

  // PUT - Bulk update attendance (for calendar operations)
  export async function PUT(request: NextRequest) {
    try {
      await connectDB();
      
      const body = await request.json();
      const { attendanceRecords } = body;
      
      const bulkOps = attendanceRecords.map((record: any) => ({
        updateOne: {
          filter: { 
            driverId: record.driverId, 
            date: new Date(record.date) 
          },
          update: { 
            $set: {
              status: record.status,
              remarks: record.remarks,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      }));
      
      await Attendance.bulkWrite(bulkOps);
      
      return NextResponse.json({ message: 'Attendance updated successfully' });
    } catch (error) {
      console.error('Error updating attendance:', error);
      return NextResponse.json(
        { error: 'Failed to update attendance' },
        { status: 500 }
      );
    }
  }