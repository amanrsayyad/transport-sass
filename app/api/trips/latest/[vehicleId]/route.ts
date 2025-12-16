import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Trip from '@/models/Trip';
import Standby from '@/models/Standby';

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

    // Find the latest trip for this vehicle (include route details and trip dates)
    const latestTrip = await Trip.findOne({ vehicleId })
      .sort({ createdAt: -1 })
      .select('endKm vehicleId tripId createdAt date routeWiseExpenseBreakdown');

    if (!latestTrip) {
      return NextResponse.json(
        { error: 'No trip records found for this vehicle' },
        { status: 404 }
      );
    }

    // Determine last route's end location (by highest routeNumber)
    const routes: any[] = (latestTrip as any).routeWiseExpenseBreakdown || [];
    const lastRoute = routes.reduce((acc: any, cur: any) => {
      if (!acc) return cur;
      const aNum = Number(acc.routeNumber || 0);
      const cNum = Number(cur.routeNumber || 0);
      return cNum >= aNum ? cur : acc;
    }, null);
    const lastToLocation: string = lastRoute?.endLocation || '';

    // Determine last relevant date: prefer last route date, else last trip date, else createdAt
    const allRouteDates: Date[] = routes
      .flatMap((r: any) => (r.dates || []).map((d: any) => new Date(d)))
      .filter((d: Date) => !isNaN(d.getTime()));
    const tripDates: Date[] = (((latestTrip as any).date || []) as Date[])
      .map((d: any) => new Date(d))
      .filter((d: Date) => !isNaN(d.getTime()));
    const lastRouteDate: Date | null = allRouteDates.length
      ? new Date(Math.max(...allRouteDates.map((d) => d.getTime())))
      : null;
    const lastTripDate: Date | null = tripDates.length
      ? new Date(Math.max(...tripDates.map((d) => d.getTime())))
      : null;
    const lastDateBase: Date = lastRouteDate || lastTripDate || latestTrip.createdAt;

    // Helpers for local day calculations
    const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
    const addDays = (dt: Date, days: number) => {
      const nd = new Date(dt);
      nd.setDate(nd.getDate() + days);
      return nd;
    };

    const todayStart = startOfDay(new Date());
    const lastDateStart = startOfDay(lastDateBase);

    // Consider latest standby date for this vehicle as part of effective last date
    const recentStandby = await Standby.find({ vehicleId })
      .select('dates updatedAt')
      .sort({ updatedAt: -1 })
      .limit(3);

    let latestStandbyDate: Date | null = null;
    let latestStandbyCount = 0;
    if (recentStandby && recentStandby.length > 0) {
      // Use the most recent record for count, and compute the max date across a few recent
      latestStandbyCount = (recentStandby[0].dates || []).length;
      for (const rec of recentStandby) {
        for (const d of (rec.dates || [])) {
          const nd = startOfDay(new Date(d));
          if (!isNaN(nd.getTime())) {
            if (!latestStandbyDate || nd.getTime() > latestStandbyDate.getTime()) {
              latestStandbyDate = nd;
            }
          }
        }
      }
    }

    const effectiveLastDate = latestStandbyDate && latestStandbyDate.getTime() > lastDateStart.getTime()
      ? latestStandbyDate
      : lastDateStart;

    let nextDate = addDays(effectiveLastDate, 1);
    // If next date is in the past (trip not made within a day), use today
    if (nextDate.getTime() < todayStart.getTime()) {
      nextDate = todayStart;
    }

    // If there is a standby record, prefer its length for standbyDays; otherwise fallback to days since last date
    const fallbackDiffMs = todayStart.getTime() - lastDateStart.getTime();
    const standbyDays = latestStandbyCount > 0
      ? latestStandbyCount
      : Math.max(0, Math.floor(fallbackDiffMs / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      endKm: (latestTrip as any).endKm || 0,
      vehicleId,
      tripId: (latestTrip as any).tripId,
      createdAt: latestTrip.createdAt,
      lastToLocation,
      lastDate: effectiveLastDate,
      nextDate,
      standbyDays,
      latestStandbyDate
    });
  } catch (error) {
    console.error('Error fetching latest trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest trip' },
      { status: 500 }
    );
  }
}