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
    // Drop legacy unique index on mobileNo if it exists to allow duplicates
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
    const { id } = await params;
    const body = await request.json();

    // Normalize optional fields
    if (typeof body.gstin === "string" && body.gstin.trim() === "") {
      // Avoid setting empty string; leave unchanged if clearing not intended
      delete body.gstin;
    }
    if (typeof body.address === "string" && body.address.trim() === "") {
      delete body.address;
    }

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
    const message =
      (error as any)?.code === 11000
        ? "Duplicate mobile number not allowed by legacy index"
        : "Failed to update app user";
    return NextResponse.json({ error: message }, { status: 500 });
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
