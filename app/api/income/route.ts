import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Income from '@/models/Income';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';

// GET - Fetch all income records with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get filter parameters
    const appUserId = searchParams.get('appUserId');
    const bankId = searchParams.get('bankId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build filter query
    const filter: any = {};
    
    if (appUserId) {
      filter.appUserId = appUserId;
    }
    
    if (bankId) {
      filter.bankId = bankId;
    }
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }
    
    // Get total count for pagination with filters
    const total = await Income.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    
    // Get paginated results with filters
    const incomes = await Income.find(filter)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return NextResponse.json({
      data: incomes,
      page,
      limit,
      total,
      pages
    });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incomes' },
      { status: 500 }
    );
  }
}

// POST - Create a new income record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { appUserId, bankId, category, amount, description, date } = body;

    // Validate required fields
    if (!appUserId || !bankId || !category || !amount || !date) {
      return NextResponse.json(
        { error: 'App user, bank, category, amount, and date are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify app user and bank exist
    const [appUser, bank] = await Promise.all([
      AppUser.findById(appUserId),
      Bank.findById(bankId)
    ]);

    if (!appUser) {
      return NextResponse.json(
        { error: 'App user not found' },
        { status: 404 }
      );
    }

    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }

    // Create income record
    const income = new Income({
      appUserId,
      bankId,
      category,
      amount,
      description,
      date: new Date(date),
    });

    await income.save();

    // Update bank balance
    await Bank.findByIdAndUpdate(bankId, {
      $inc: { balance: amount }
    });

    // Get updated bank balance
    const updatedBank = await Bank.findById(bankId);

    // Create transaction record
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = new Transaction({
      transactionId,
      type: 'INCOME',
      description: description || `Income - ${category}`,
      amount,
      toBankId: bankId,
      appUserId,
      relatedEntityId: income._id,
      relatedEntityType: 'Income',
      category,
      balanceAfter: updatedBank?.balance || 0,
      date: new Date(date),
    });

    await transaction.save();

    // Update income with transaction ID
    income.transactionId = transaction._id;
    await income.save();

    const populatedIncome = await Income.findById(income._id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber');

    return NextResponse.json(populatedIncome, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json(
      { error: 'Failed to create income' },
      { status: 500 }
    );
  }
}