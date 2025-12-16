import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';

// GET - Fetch a specific expense record by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const expense = await Expense.findById(params.id)
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber');

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense record' },
      { status: 500 }
    );
  }
}

// PUT - Update an expense record
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

    const existingExpense = await Expense.findById(params.id);
    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense record not found' },
        { status: 404 }
      );
    }

    const appUser = await AppUser.findById(appUserId);
    if (!appUser) {
      return NextResponse.json(
        { error: 'App user not found' },
        { status: 404 }
      );
    }

    const bank = await Bank.findById(bankId);
    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      );
    }

    // Calculate amount difference and ensure sufficient balance if increasing expense
    const amountDifference = amount - existingExpense.amount; // positive means more expense

    if (amountDifference > 0 && bank.balance < amountDifference) {
      return NextResponse.json(
        { error: 'Insufficient bank balance to increase this expense' },
        { status: 400 }
      );
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      params.id,
      {
        appUserId,
        bankId,
        category,
        amount,
        description: description || '',
        date: new Date(date),
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate('appUserId', 'name email')
      .populate('bankId', 'bankName accountNumber');

    // Adjust bank balance: expenses decrease balance
    await Bank.findByIdAndUpdate(bankId, { $inc: { balance: -amountDifference } });

    // Update the associated transaction if present
    if (existingExpense.transactionId) {
      await Transaction.findByIdAndUpdate(existingExpense.transactionId, {
        appUserId,
        bankId,
        type: 'EXPENSE',
        category,
        amount,
        description: description || '',
        date: new Date(date),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an expense record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const existingExpense = await Expense.findById(params.id);
    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense record not found' },
        { status: 404 }
      );
    }

    // Delete the expense
    await Expense.findByIdAndDelete(params.id);

    // Revert bank balance: add back the expense amount
    await Bank.findByIdAndUpdate(existingExpense.bankId, {
      $inc: { balance: existingExpense.amount },
    });

    // Delete associated transaction if available
    if (existingExpense.transactionId) {
      await Transaction.findByIdAndDelete(existingExpense.transactionId);
    }

    return NextResponse.json({ message: 'Expense record deleted successfully', id: params.id });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense record' },
      { status: 500 }
    );
  }
}