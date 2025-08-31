import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Mechanic from "@/models/Mechanic";

export async function GET() {
  try {
    await connectDB();
    const mechanics = await Mechanic.find({}).sort({ createdAt: -1 });
    return NextResponse.json(mechanics);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch mechanics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    // Check if phone number already exists
    const existingMechanic = await Mechanic.findOne({ phone: body.phone });
    if (existingMechanic) {
      return NextResponse.json(
        { error: "Phone number already exists" },
        { status: 400 }
      );
    }

    const mechanic = new Mechanic(body);
    await mechanic.save();
    return NextResponse.json(mechanic, { status: 201 });
  } catch (error) {
    console.error("Error creating mechanic:", error);
    return NextResponse.json(
      { error: "Failed to create mechanic"},
      { status: 500 }
    );
  }
}