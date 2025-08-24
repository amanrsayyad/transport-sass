import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Maintenance from '@/models/Maintenance';
import Bank from '@/models/Bank';
import Expense from '@/models/Expense';
import Transaction from '@/models/Transaction';

// GET - Fetch single maintenance record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    const maintenance = await Maintenance.findById(resolvedParams.id)
      .populate('appUserId', 'name')
      .populate('vehicleId', 'vehicleNumber')
      .populate('bankId', 'bankName');
    
    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(maintenance);
  } catch (error) {
    console.error('Error fetching maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance record' },
      { status: 500 }
    );
  }
}

// PUT - Update maintenance record (accept/decline notification, complete maintenance)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { action } = body;
    
    const resolvedParams = await params;
    const maintenance = await Maintenance.findById(resolvedParams.id);
    
    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    if (action === 'accept') {
      // User accepted the notification - complete the maintenance
      
      // 1. Update bank balance
      const bank = await Bank.findById(maintenance.bankId);
      if (!bank) {
        return NextResponse.json(
          { error: 'Bank not found' },
          { status: 404 }
        );
      }
      
      if (bank.balance < maintenance.categoryAmount) {
        return NextResponse.json(
          { error: 'Insufficient bank balance' },
          { status: 400 }
        );
      }
      
      bank.balance -= maintenance.categoryAmount;
      await bank.save();
      
      // 2. Create expense record
      const expense = await Expense.create({
        appUserId: maintenance.appUserId,
        bankId: maintenance.bankId,
        category: maintenance.category,
        amount: maintenance.categoryAmount,
        description: `Maintenance - ${maintenance.category} for ${maintenance.vehicleNumber}`,
        date: new Date()
      });
      
      // 3. Create transaction record
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction = await Transaction.create({
        transactionId,
        appUserId: maintenance.appUserId,
        fromBankId: maintenance.bankId,
        type: 'EXPENSE',
        category: 'Maintenance',
        amount: maintenance.categoryAmount,
        description: `Maintenance - ${maintenance.category}`,
        relatedEntityId: expense._id,
        relatedEntityType: 'Expense',
        date: new Date()
      });
      
      // 4. Update maintenance record
      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        resolvedParams.id,
        {
          status: 'Completed',
          isCompleted: true,
          completedAt: new Date(),
          expenseId: expense._id,
          transactionId: transaction._id
        },
        { new: true }
      );
      
      return NextResponse.json({
        maintenance: updatedMaintenance,
        expense,
        transaction,
        message: 'Maintenance completed successfully'
      });
      
    } else if (action === 'decline') {
      // User declined the notification - just mark as notification sent
      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        resolvedParams.id,
        { isNotificationSent: true },
        { new: true }
      );
      
      return NextResponse.json({
        maintenance: updatedMaintenance,
        message: 'Notification declined'
      });
      
    } else {
      // Regular update
      const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        resolvedParams.id,
        body,
        { new: true }
      );
      
      return NextResponse.json(updatedMaintenance);
    }
    
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete maintenance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    const maintenance = await Maintenance.findByIdAndDelete(resolvedParams.id);
    
    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}