import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Bank from "@/models/Bank";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const banks = await Bank.find({ 
      appUserId: params.id,
      isActive: true 
    })
      .populate('appUserId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(banks);
  } catch (error) {
    console.error('Error fetching banks for app user:', error);
    return NextResponse.json(
      { error: "Failed to fetch banks for app user" },
      { status: 500 }
    );
  }
}