import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Bank from '@/models/Bank';
import Transaction from '@/models/Transaction';

// GET - Fetch a specific expense record by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const expense = await Expense.findById(params.id);
    
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
    const { category, amount, description, date } = body;
    
    // Validation
    if (!category || !amount || amount <= 0 || !date) {
      return NextResponse.json(
        { error: 'Missing required fields or invalid amount' },
        { status: 400 }
      );
    }
    
    // Find the existing expense
    const existingExpense = await Expense.findById(params.id);
    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense record not found' },
        { status: 404 }
      );
    }
    
    // Start a transaction
    const session = await Expense.startSession();
    session.startTransaction();
    
    try {
      // Update the expense record
      const updatedExpense = await Expense.findByIdAndUpdate(
        params.id,
        {
          category,
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          updatedAt: new Date()
        },
        { new: true, session }
      );
      
      // Create a transaction record for the expense update
      await Transaction.create([{
        type: 'expense_update',
        description: `Updated expense: ${category}`,
        amount: parseFloat(amount),
        previousAmount: existingExpense.amount,
        date: new Date(date),
        relatedId: params.id,
        relatedModel: 'Expense'
      }], { session });
      
      await session.commitTransaction();
      
      return NextResponse.json(updatedExpense);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
    
    // Find the expense to delete
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return NextResponse.json(
        { error: 'Expense record not found' },
        { status: 404 }
      );
    }
    
    // Start a transaction
    const session = await Expense.startSession();
    session.startTransaction();
    
    try {
      // Delete the expense record
      await Expense.findByIdAndDelete(params.id, { session });
      
      // Create a transaction record for the deletion
      await Transaction.create([{
        type: 'expense_delete',
        description: `Deleted expense: ${expense.category}`,
        amount: expense.amount,
        date: new Date(),
        relatedId: params.id,
        relatedModel: 'Expense'
      }], { session });
      
      await session.commitTransaction();
      
      return NextResponse.json({ 
        message: 'Expense record deleted successfully',
        deletedExpense: expense 
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense record' },
      { status: 500 }
    );
  }
}