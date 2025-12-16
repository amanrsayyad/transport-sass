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
    // Drop legacy unique index on mobileNo if present to allow duplicates
    try {
      const idxCursor = AppUser.collection.listIndexes();
      const indexes = await idxCursor.toArray();
      const mobileIdx = indexes.find(
        (idx: any) => idx.name === "mobileNo_1" || (idx.key && idx.key.mobileNo === 1)
      );
      if (mobileIdx && mobileIdx.unique) {
        await AppUser.collection.dropIndex(mobileIdx.name || "mobileNo_1").catch(() => {});
      }
    } catch {}
    const body = await request.json();

    // Normalize optional fields
    if (body.gstin === "") {
      delete body.gstin;
    }
    if (body.address === "") {
      delete body.address;
    }

    const appUser = new AppUser(body);
    await appUser.save();
    return NextResponse.json(appUser, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as any)?.code === 11000 ? "Duplicate mobile number not allowed by legacy index" : "Failed to create app user" },
      { status: 500 }
    );
  }
}
