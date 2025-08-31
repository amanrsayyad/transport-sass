import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const customer = await Customer.findById(params.id);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer.products || []);
  } catch (error) {
    console.error('Error fetching customer products:', error);
    return NextResponse.json(
      { error: "Failed to fetch customer products" },
      { status: 500 }
    );
  }
}