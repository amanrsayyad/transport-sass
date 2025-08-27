import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';

// GET - Fetch all banks
export async function GET() {
  try {
    await connectDB();
    
    const banks = await Bank.find({ isActive: true })
      .populate('appUserId', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

// POST - Create a new bank
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { bankName, accountNumber, balance, appUserId } = body;

    // Validate required fields
    if (!bankName || !accountNumber || !appUserId) {
      return NextResponse.json(
        { error: 'Bank name, account number, and app user ID are required' },
        { status: 400 }
      );
    }

    // Check if account number already exists
    const existingBank = await Bank.findOne({ accountNumber });
    if (existingBank) {
      return NextResponse.json(
        { error: 'Account number already exists' },
        { status: 400 }
      );
    }

    // Verify app user exists
    const appUser = await AppUser.findById(appUserId);
    if (!appUser) {
      return NextResponse.json(
        { error: 'App user not found' },
        { status: 404 }
      );
    }

    // Create bank
    const bank = new Bank({
      bankName,
      accountNumber,
      balance: balance || 0,
      appUserId,
    });

    await bank.save();

    // Create initial transaction record if balance > 0
    if (balance && balance > 0) {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const transaction = new Transaction({
        transactionId,
        type: 'BANK_UPDATE',
        description: `Initial balance for ${bankName}`,
        amount: balance,
        toBankId: bank._id,
        appUserId,
        relatedEntityId: bank._id,
        relatedEntityType: 'Bank',
        category: 'Initial Balance',
        balanceAfter: balance,
      });

      await transaction.save();
    }

    const populatedBank = await Bank.findById(bank._id)
      .populate('appUserId', 'name email');

    return NextResponse.json(populatedBank, { status: 201 });
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    );
  }
}