import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverBudget from '@/models/DriverBudget';
import Expense from '@/models/Expense';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';
import Driver from '@/models/Driver';

// GET - Fetch driver budget records with optional filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    let query = {};
    if (driverId) {
      query = { driverId };
    }
    
    // If filtering by driverId, return the latest budget with calculated remaining budget
    if (driverId) {
      const budgets = await DriverBudget.find(query)
        .populate('appUserId', 'name email')
        .populate('bankId', 'bankName accountNumber')
        .populate('driverId', 'name licenseNumber')
        .sort({ createdAt: -1 })
        .limit(1);
        
      if (budgets.length > 0) {
        const latestBudget = budgets[0];
        // Calculate remaining budget based on expenses (this would need to be implemented based on your business logic)
        const remainingBudget = latestBudget.dailyBudgetAmount; // Simplified for now
        
        return NextResponse.json({
          ...latestBudget.toObject(),
          budgetAmount: latestBudget.dailyBudgetAmount,
          remainingBudget
        });
      }
    }
    
    // Get total count for pagination
    const total = await DriverBudget.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get paginated results
    const budgets = await DriverBudget.find(query)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('driverId', 'name licenseNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return NextResponse.json({
      data: budgets,
      page,
      limit,
      total,
      pages
    });
  } catch (error) {
    console.error('Error fetching driver budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver budgets' },
      { status: 500 }
    );
  }
}

// POST - Create a new driver budget record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { appUserId, bankId, driverId, dailyBudgetAmount, description, date, paymentType } = body;

    // Validate required fields
    if (!appUserId || !bankId || !driverId || !dailyBudgetAmount || !date) {
      return NextResponse.json(
        { error: 'App user, bank, driver, daily budget amount, and date are required' },
        { status: 400 }
      );
    }

    if (dailyBudgetAmount <= 0) {
      return NextResponse.json(
        { error: 'Daily budget amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify app user, bank, and driver exist
    const [appUser, bank, driver] = await Promise.all([
      AppUser.findById(appUserId),
      Bank.findById(bankId),
      Driver.findById(driverId)
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

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Check if bank has sufficient balance
    if (bank.balance < dailyBudgetAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance in bank account' },
        { status: 400 }
      );
    }

    // Fetch previous budget record for the same driver to carry forward remaining amount
    const previousBudget = await DriverBudget.findOne({ driverId })
      .sort({ createdAt: -1 });
    
    // Carry forward uses the previous remaining amount
    const carryForwardAmount = previousBudget?.remainingBudgetAmount || 0;
    const totalBudgetAmount = dailyBudgetAmount + carryForwardAmount;

    // Create driver budget record
    const driverBudget = new DriverBudget({
      appUserId,
      bankId,
      driverId,
      dailyBudgetAmount: totalBudgetAmount,
      remainingBudgetAmount: totalBudgetAmount,
      description,
      date: new Date(date),
      paymentType,
    });

    await driverBudget.save();

    // Clear the remaining budget amount from the previous record
    if (previousBudget && previousBudget.remainingBudgetAmount > 0) {
      await DriverBudget.findByIdAndUpdate(previousBudget._id, {
        remainingBudgetAmount: 0
      });
    }

    // Update bank balance for only the new budget amount
    await Bank.findByIdAndUpdate(bankId, {
      $inc: { balance: -dailyBudgetAmount }
    });

    // Get updated bank balance
    const updatedBank = await Bank.findById(bankId);

    // Create transaction record
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = new Transaction({
      transactionId,
      type: 'DRIVER_BUDGET',
      description: description || `Daily budget for ${driver.name}`,
      amount: dailyBudgetAmount,
      fromBankId: bankId,
      appUserId,
      relatedEntityId: driverBudget._id,
      relatedEntityType: 'DriverBudget',
      category: 'Driver Budget',
      balanceAfter: updatedBank?.balance || 0,
      date: new Date(date),
    });

    await transaction.save();

    // Update driver budget with transaction ID
    driverBudget.transactionId = transaction._id;
    await driverBudget.save();

    // Create an expense record for only the new daily budget amount
    const expense = new Expense({
      appUserId,
      bankId,
      category: 'Driver Budget',
      amount: dailyBudgetAmount,
      description: description || `Daily budget for ${driver.name}`,
      date: new Date(date),
      transactionId: transaction._id,
    });

    await expense.save();

    const populatedBudget = await DriverBudget.findById(driverBudget._id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber')
      .populate('driverId', 'name licenseNumber');

    return NextResponse.json(populatedBudget, { status: 201 });
  } catch (error) {
    console.error('Error creating driver budget:', error);
    return NextResponse.json(
      { error: 'Failed to create driver budget' },
      { status: 500 }
    );
  }
}