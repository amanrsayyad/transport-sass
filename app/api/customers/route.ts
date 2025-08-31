import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET() {
  try {
    await connectDB();
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    // Check if mobile number already exists
    const existingCustomer = await Customer.findOne({ mobileNo: body.mobileNo });
    if (existingCustomer) {
      return NextResponse.json(
        { error: "Mobile number already exists" },
        { status: 400 }
      );
    }

    const customer = new Customer(body);
    await customer.save();
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}