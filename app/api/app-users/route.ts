import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AppUser from "@/models/AppUser";

export async function GET() {
  try {
    await connectDB();
    const appUsers = await AppUser.find({}).sort({ createdAt: -1 });
    return NextResponse.json(appUsers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch app users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    // Check if mobile number already exists
    const existingUser = await AppUser.findOne({ mobileNo: body.mobileNo });
    if (existingUser) {
      return NextResponse.json(
        { error: "Mobile number already exists" },
        { status: 400 }
      );
    }

    const appUser = new AppUser(body);
    await appUser.save();
    return NextResponse.json(appUser, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create app user" },
      { status: 500 }
    );
  }
}
