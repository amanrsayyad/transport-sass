import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Income from '@/models/Income';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';

// GET - Fetch a specific income record by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const income = await Income.findById(params.id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber');
    
    if (!income) {
      return NextResponse.json(
        { error: 'Income record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(income);
  } catch (error) {
    console.error('Error fetching income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income record' },
      { status: 500 }
    );
  }
}

// PUT - Update an income record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { appUserId, bankId, category, amount, description, date } = body;
    
    // Validation
    if (!appUserId || !bankId || !category || !amount || amount <= 0 || !date) {
      return NextResponse.json(
        { error: 'All required fields must be provided with valid values' },
        { status: 400 }
      );
    }
    
    // Check if income record exists
    const existingIncome = await Income.findById(params.id);
    if (!existingIncome) {
      return NextResponse.json(
        { error: 'Income record not found' },
        { status: 404 }
      );
    }
    
    // Verify AppUser exists
    const appUser = await AppUser.findById(appUserId);
    if (!appUser) {
      return NextResponse.json(
        { error: 'App user not found' },
        { status: 404 }
      );
    }
    
    // Verify Bank exists
    const bank = await Bank.findById(bankId);
    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }
    
    // Calculate the difference in amount for bank balance adjustment
    const amountDifference = amount - existingIncome.amount;
    
    // Update the income record
    const updatedIncome = await Income.findByIdAndUpdate(
      params.id,
      {
        appUserId,
        bankId,
        category,
        amount,
        description: description || '',
        date: new Date(date),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('appUserId', 'name email')
     .populate('bankId', 'bankName accountNumber');
    
    // Update bank balance (add the difference since income increases balance)
    await Bank.findByIdAndUpdate(
      bankId,
      { $inc: { balance: amountDifference } }
    );
    
    // Update the existing transaction if it exists
    if (existingIncome.transactionId) {
      await Transaction.findByIdAndUpdate(
        existingIncome.transactionId,
        {
          appUserId,
          bankId,
          type: 'Income',
          category,
          amount,
          description: description || '',
          date: new Date(date),
          updatedAt: new Date()
        }
      );
    }
    
    return NextResponse.json(updatedIncome);
  } catch (error) {
    console.error('Error updating income:', error);
    return NextResponse.json(
      { error: 'Failed to update income record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an income record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Check if income record exists
    const existingIncome = await Income.findById(params.id);
    if (!existingIncome) {
      return NextResponse.json(
        { error: 'Income record not found' },
        { status: 404 }
      );
    }
    
    // Verify Bank exists and has sufficient balance to reverse the income
    const bank = await Bank.findById(existingIncome.bankId);
    if (!bank) {
      return NextResponse.json(
        { error: 'Associated bank not found' },
        { status: 404 }
      );
    }
    
    if (bank.balance < existingIncome.amount) {
      return NextResponse.json(
        { error: 'Insufficient bank balance to delete this income record' },
        { status: 400 }
      );
    }
    
    // Delete the income record
    await Income.findByIdAndDelete(params.id);
    
    // Update bank balance (subtract the income amount)
    await Bank.findByIdAndUpdate(
      existingIncome.bankId,
      { $inc: { balance: -existingIncome.amount } }
    );
    
    // Delete the associated transaction if it exists
    if (existingIncome.transactionId) {
      await Transaction.findByIdAndDelete(existingIncome.transactionId);
    }
    
    return NextResponse.json({ 
      message: 'Income record deleted successfully',
      id: params.id 
    });
  } catch (error) {
    console.error('Error deleting income:', error);
    return NextResponse.json(
      { error: 'Failed to delete income record' },
      { status: 500 }
    );
  }
}