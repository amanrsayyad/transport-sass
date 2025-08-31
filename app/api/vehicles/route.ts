import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";

export async function GET() {
  try {
    await connectDB();
    const vehicles = await Vehicle.find({}).sort({ createdAt: -1 });
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    // Check if registration number already exists
    const existingVehicle = await Vehicle.findOne({
      registrationNumber: body.registrationNumber.toUpperCase(),
    });
    if (existingVehicle) {
      return NextResponse.json(
        { error: "Registration number already exists" },
        { status: 400 }
      );
    }

    const vehicle = new Vehicle(body);
    await vehicle.save();
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
