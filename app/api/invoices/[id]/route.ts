import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
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
    const existing = await Invoice.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Calculate totals for each row and compute tax-inclusive total
    let baseRows = existing.rows;
    if (body.rows) {
      body.rows.forEach((row: any) => {
        if (row.weight && row.rate) {
          row.total = row.weight * row.rate;
        }
      });
      baseRows = body.rows;
    }
    const baseTotal = (baseRows || []).reduce((sum: number, row: any) => sum + (row.total || 0), 0);
    const resolvedTaxPercent = body.taxPercent !== undefined && body.taxPercent !== null
      ? Number(body.taxPercent)
      : Number((existing as any).taxPercent || 0);
    const taxAmount = resolvedTaxPercent > 0 ? (baseTotal * resolvedTaxPercent) / 100 : 0;
    body.taxPercent = resolvedTaxPercent;
    body.taxAmount = taxAmount;
    const nextTotal = baseTotal + taxAmount;
    body.total = nextTotal;
    const nextAdvance = typeof body.advanceAmount === 'number' ? Number(body.advanceAmount) : Number(existing.advanceAmount || 0);
    body.advanceAmount = nextAdvance;
    body.remainingAmount = Math.max(0, nextTotal - nextAdvance);
    
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update invoice' },
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
    
    const invoice = await Invoice.findByIdAndDelete(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}