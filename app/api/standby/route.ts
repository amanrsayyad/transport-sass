import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Standby from '@/models/Standby';
import Attendance from '@/models/Attendance';
import Driver from '@/models/Driver';

// Helpers
const normalizeDate = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);

// GET - Fetch standby records; if vehicleId provided, return latest for vehicle
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    if (vehicleId) {
      const records = await Standby.find({ vehicleId })
        .select('vehicleId driverId driverName dates attendanceStatus remarks updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(5);

      if (!records || records.length === 0) {
        return NextResponse.json([]);
      }

      // Compute the latest standby date across a few recent records
      let latestDate: Date | null = null;
      for (const rec of records) {
        for (const d of (rec.dates || [])) {
          const nd = new Date(d);
          if (!isNaN(nd.getTime())) {
            if (!latestDate || nd.getTime() > latestDate.getTime()) {
              latestDate = nd;
            }
          }
        }
      }
      return NextResponse.json({ latestStandbyDate: latestDate, standbyRecords: records });
    }

    const all = await Standby.find()
      .sort({ updatedAt: -1 })
      .limit(100);
    return NextResponse.json(all);
  } catch (error) {
    console.error('Error fetching standby records:', error);
    return NextResponse.json({ error: 'Failed to fetch standby records' }, { status: 500 });
  }
}

// POST - Create standby record and upsert attendance for selected dates
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { vehicleId, driverId, dates, attendanceStatus, remarks, createdBy } = body || {};

    if (!vehicleId || !driverId || !Array.isArray(dates) || dates.length === 0 || !attendanceStatus || !createdBy) {
      return NextResponse.json({ error: 'vehicleId, driverId, dates[], attendanceStatus, and createdBy are required' }, { status: 400 });
    }

    if (!['Present', 'Absent'].includes(attendanceStatus)) {
      return NextResponse.json({ error: 'attendanceStatus must be Present or Absent' }, { status: 400 });
    }

    const driver = await Driver.findById(driverId).select('name');
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const normalizedDates: Date[] = dates.map((d: any) => {
      const dt = new Date(d);
      return normalizeDate(dt);
    }).filter((dt: Date) => !isNaN(dt.getTime()));

    if (normalizedDates.length === 0) {
      return NextResponse.json({ error: 'No valid dates provided' }, { status: 400 });
    }

    const standby = await Standby.create({
      vehicleId,
      driverId,
      driverName: driver.name,
      dates: normalizedDates,
      attendanceStatus,
      remarks,
      createdBy
    });

    // Upsert attendance for each date
    const bulkOps = normalizedDates.map((date) => ({
      updateOne: {
        filter: { driverId, date },
        update: {
          $set: {
            driverId,
            driverName: driver.name,
            date,
            status: attendanceStatus,
            remarks: remarks || 'Standby',
            createdBy
          }
        },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(bulkOps);

    // Populate minimal response
    const resp = await Standby.findById(standby._id)
      .populate('vehicleId', 'vehicleNumber')
      .populate('driverId', 'name');
    return NextResponse.json(resp, { status: 201 });
  } catch (error) {
    console.error('Error creating standby record:', error);
    return NextResponse.json({ error: 'Failed to create standby record' }, { status: 500 });
  }
}