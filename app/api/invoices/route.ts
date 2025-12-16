import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const customerName = searchParams.get('customerName');
    const lrNo = searchParams.get('lrNo');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (customerName && customerName !== 'all') {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }
    if (lrNo) {
      filter.lrNo = { $regex: lrNo, $options: 'i' };
    }
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) {
        const start = new Date(fromDate);
        filter.date.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Invoice.countDocuments(filter);
    
    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Generate LR number if not provided
    if (!body.lrNo) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      body.lrNo = `LR${dateStr}${randomNum}`;
    }
    
    // Validate required fields
    const requiredFields = ['date', 'from', 'to', 'customerName'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Validate rows
    if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: 'At least one row is required' },
        { status: 400 }
      );
    }
    
    // Validate each row
    for (const row of body.rows) {
      if (!row.product || !row.truckNo) {
        return NextResponse.json(
          { error: 'Product and truck number are required for each row' },
          { status: 400 }
        );
      }
    }
    
    // Calculate totals for each row
    body.rows.forEach((row: any) => {
      if (row.weight && row.rate) {
        row.total = row.weight * row.rate;
      }
    });
    
    // Calculate base total and tax
    const baseTotal = body.rows.reduce((sum: number, row: any) => sum + (row.total || 0), 0);
    const taxPercent = body.taxPercent !== undefined && body.taxPercent !== null
      ? Number(body.taxPercent)
      : 0;
    const taxAmount = taxPercent > 0 ? (baseTotal * taxPercent) / 100 : 0;
    body.taxPercent = taxPercent;
    body.taxAmount = taxAmount;
    // Final total includes tax amount
    body.total = baseTotal + taxAmount;
    
    // Support advance and remaining
    const advanceAmount = Number(body.advanceAmount || 0);
    body.advanceAmount = advanceAmount;
    body.remainingAmount = Math.max(0, body.total - advanceAmount);
    
    const invoice = new Invoice(body);
    await invoice.save();
    
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'LR number already exists' },
        { status: 400 }
      );
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}