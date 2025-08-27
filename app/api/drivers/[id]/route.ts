import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Driver from "@/models/Driver";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const driver = await Driver.findById(id);

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch driver" },
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

    const driver = await Driver.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update driver" },
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
    const driver = await Driver.findByIdAndDelete(id);

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete driver" },
      { status: 500 }
    );
  }
}
