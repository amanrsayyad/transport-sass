import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Bank from '@/models/Bank';
import Income from '@/models/Income';
import Transaction from '@/models/Transaction';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      invoiceIds,
      status,
      bankId,
      appUserId,
      category,
      description,
      date
    } = body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'invoiceIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!['Paid', 'Unpaid'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be Paid or Unpaid' },
        { status: 400 }
      );
    }

    // For marking as Paid, require bank and app user info
    if (status === 'Paid') {
      if (!bankId || !appUserId) {
        return NextResponse.json(
          { error: 'bankId and appUserId are required to mark invoices as Paid' },
          { status: 400 }
        );
      }
      const bank = await Bank.findById(bankId);
      if (!bank) {
        return NextResponse.json(
          { error: 'Bank not found' },
          { status: 404 }
        );
      }
    }

    // Fetch invoices
    const invoices = await Invoice.find({ _id: { $in: invoiceIds } });
    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found for provided IDs' },
        { status: 404 }
      );
    }

    const processed: any[] = [];
    const nowDate = date ? new Date(date) : new Date();
    const defaultCategory = category || 'Invoice Payment';

    for (const inv of invoices) {
      // Update invoice status
      inv.status = status as any;

      // If marking Paid, create income and transaction, update bank balance
      if (status === 'Paid') {
        const amountToCredit = Math.max(0, (inv.remainingAmount || ((inv.total || 0) - (inv.advanceAmount || 0))));

        // Only create income/transaction if there is a positive remaining amount
        if (amountToCredit > 0) {
          // Create income record
          const income = new Income({
            appUserId,
            bankId,
            category: defaultCategory,
            amount: amountToCredit,
            description: description || `Payment received for invoice ${inv.lrNo}`,
            date: nowDate,
          });
          await income.save();

          // Update bank balance
          await Bank.findByIdAndUpdate(bankId, { $inc: { balance: amountToCredit } });
          const updatedBank = await Bank.findById(bankId);

          // Create transaction record
          const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const transaction = new Transaction({
            transactionId,
            type: 'INCOME',
            description: description || `Income - ${defaultCategory} (Invoice ${inv.lrNo})`,
            amount: amountToCredit,
            toBankId: bankId,
            appUserId,
            relatedEntityId: income._id,
            relatedEntityType: 'Income',
            category: defaultCategory,
            balanceAfter: updatedBank?.balance || 0,
            date: nowDate,
          });
          await transaction.save();

          // Back-reference transaction from income
          income.transactionId = transaction._id;
          await income.save();
        }
      }

      await inv.save();
      processed.push(inv);
    }

    return NextResponse.json({
      updatedCount: processed.length,
      invoices: processed,
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice statuses' },
      { status: 500 }
    );
  }
}