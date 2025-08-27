import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET(
  request: NextRequest,
  { params }: { params: { customerName: string } }
) {
  try {
    await connectDB();
    const decodedCustomerName = decodeURIComponent(params.customerName);
    
    const customer = await Customer.findOne({ customerName: decodedCustomerName });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer.products || []);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}