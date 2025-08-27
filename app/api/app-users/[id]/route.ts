import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AppUser from "@/models/AppUser";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const appUser = await AppUser.findById(id);

    if (!appUser) {
      return NextResponse.json(
        { error: "App user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appUser);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch app user" },
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

    const appUser = await AppUser.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!appUser) {
      return NextResponse.json(
        { error: "App user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appUser);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update app user" },
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
    const appUser = await AppUser.findByIdAndDelete(id);

    if (!appUser) {
      return NextResponse.json(
        { error: "App user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "App user deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete app user" },
      { status: 500 }
    );
  }
}
