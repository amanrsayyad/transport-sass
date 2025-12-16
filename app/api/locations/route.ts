import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Location from "@/models/Location";

export async function GET() {
  try {
    await connectDB();
    const locations = await Location.find({}).sort({ locationName: 1 });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const rawName = (body?.locationName || "").trim();
    if (!rawName) {
      return NextResponse.json({ error: "locationName is required" }, { status: 400 });
    }

    const existing = await Location.findOne({ locationName: rawName });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const loc = new Location({ locationName: rawName });
    await loc.save();
    return NextResponse.json(loc, { status: 201 });
  } catch (error: any) {
    const msg = error?.message || "Failed to create location";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}