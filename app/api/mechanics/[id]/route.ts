import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Mechanic from "@/models/Mechanic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const mechanic = await Mechanic.findById(id);

    if (!mechanic) {
      return NextResponse.json(
        { error: "Mechanic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mechanic);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch mechanic" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Check if phone number already exists (excluding current mechanic)
    if (body.phone) {
      const existingPhone = await Mechanic.findOne({ 
        phone: body.phone, 
        _id: { $ne: id } 
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already exists" },
          { status: 400 }
        );
      }
    }

    const mechanic = await Mechanic.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!mechanic) {
      return NextResponse.json(
        { error: "Mechanic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mechanic);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update mechanic" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const mechanic = await Mechanic.findByIdAndDelete(id);

    if (!mechanic) {
      return NextResponse.json(
        { error: "Mechanic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Mechanic deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete mechanic" },
      { status: 500 }
    );
  }
}