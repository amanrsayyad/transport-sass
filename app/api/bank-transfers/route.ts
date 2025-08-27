import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bank from '@/models/Bank';
import BankTransfer from '@/models/BankTransfer';
import Transaction from '@/models/Transaction';

// POST - Create a bank transfer
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { fromBankId, toBankId, amount, description } = body;

    // Validate required fields
    if (!fromBankId || !toBankId || !amount) {
      return NextResponse.json(
        { error: 'From bank, to bank, and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (fromBankId === toBankId) {
      return NextResponse.json(
        { error: 'Cannot transfer to the same bank account' },
        { status: 400 }
      );
    }

    // Get both banks
    const fromBank = await Bank.findById(fromBankId);
    const toBank = await Bank.findById(toBankId);

    if (!fromBank || !toBank) {
      return NextResponse.json(
        { error: 'One or both bank accounts not found' },
        { status: 404 }
      );
    }

    // Check if from bank has sufficient balance
    if (fromBank.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance in source account' },
        { status: 400 }
      );
    }

    // Create transfer record
    const transfer = new BankTransfer({
      fromBankId,
      toBankId,
      amount,
      description: description || `Transfer from ${fromBank.bankName} to ${toBank.bankName}`,
      transferDate: new Date(),
    });

    await transfer.save();

    // Update bank balances
    await Bank.findByIdAndUpdate(fromBankId, {
      $inc: { balance: -amount }
    });

    await Bank.findByIdAndUpdate(toBankId, {
      $inc: { balance: amount }
    });

    // Create transaction record
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = new Transaction({
      transactionId,
      type: 'TRANSFER',
      description: transfer.description,
      amount,
      fromBankId,
      toBankId,
      appUserId: fromBank.appUserId,
      relatedEntityId: transfer._id,
      relatedEntityType: 'Transfer',
      category: 'Bank Transfer',
      balanceAfter: fromBank.balance - amount,
    });

    await transaction.save();

    // Update transfer with transaction ID
    transfer.transactionId = transaction._id;
    await transfer.save();

    const populatedTransfer = await BankTransfer.findById(transfer._id)
      .populate('fromBankId', 'bankName accountNumber')
      .populate('toBankId', 'bankName accountNumber');

    return NextResponse.json(populatedTransfer, { status: 201 });
  } catch (error) {
    console.error('Error creating bank transfer:', error);
    return NextResponse.json(
      { error: 'Failed to create bank transfer' },
      { status: 500 }
    );
  }
}

// GET - Fetch all bank transfers
export async function GET() {
  try {
    await connectDB();
    
    const transfers = await BankTransfer.find()
      .populate('fromBankId', 'bankName accountNumber')
      .populate('toBankId', 'bankName accountNumber')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error fetching bank transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank transfers' },
      { status: 500 }
    );
  }
}