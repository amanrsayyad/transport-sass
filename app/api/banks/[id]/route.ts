import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';

// GET - Fetch a single bank
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const bank = await Bank.findById(id)
      .populate('appUserId', 'name email');
    
    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(bank);
  } catch (error) {
    console.error('Error fetching bank:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank' },
      { status: 500 }
    );
  }
}

// PUT - Update a bank
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const body = await request.json();
    const { bankName, accountNumber, balance } = body;

    const bank = await Bank.findById(id);
    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }

    // Check if account number already exists (excluding current bank)
    if (accountNumber && accountNumber !== bank.accountNumber) {
      const existingBank = await Bank.findOne({ 
        accountNumber, 
        _id: { $ne: id } 
      });
      if (existingBank) {
        return NextResponse.json(
          { error: 'Account number already exists' },
          { status: 400 }
        );
      }
    }

    const oldBalance = bank.balance;
    
    // Update bank
    const updatedBank = await Bank.findByIdAndUpdate(
      id,
      { bankName, accountNumber, balance },
      { new: true }
    ).populate('appUserId', 'name email');

    // Create transaction record if balance changed
    if (balance !== undefined && balance !== oldBalance) {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const balanceDiff = balance - oldBalance;
      
      const transaction = new Transaction({
        transactionId,
        type: 'BANK_UPDATE',
        description: `Balance update for ${bankName || bank.bankName}`,
        amount: Math.abs(balanceDiff),
        toBankId: balanceDiff > 0 ? bank._id : undefined,
        fromBankId: balanceDiff < 0 ? bank._id : undefined,
        appUserId: bank.appUserId,
        relatedEntityId: bank._id,
        relatedEntityType: 'Bank',
        category: 'Balance Update',
        balanceAfter: balance,
      });

      await transaction.save();
    }

    return NextResponse.json(updatedBank);
  } catch (error) {
    console.error('Error updating bank:', error);
    return NextResponse.json(
      { error: 'Failed to update bank' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a bank
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const bank = await Bank.findById(id);
    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await Bank.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank:', error);
    return NextResponse.json(
      { error: 'Failed to delete bank' },
      { status: 500 }
    );
  }
}