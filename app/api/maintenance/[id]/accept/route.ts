import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Maintenance from "@/models/Maintenance";
import Bank from "@/models/Bank";
import Expense from "@/models/Expense";
import Transaction from "@/models/Transaction";
import Vehicle from "@/models/Vehicle";
import AppUser from "@/models/AppUser";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const maintenanceId = resolvedParams.id;

    // Find the maintenance record
    const maintenance = await Maintenance.findById(maintenanceId)
      .populate('appUserId')
      .populate('vehicleId');

    if (!maintenance) {
      return NextResponse.json(
        { message: "Maintenance record not found" },
        { status: 404 }
      );
    }

    // Check if maintenance is already completed
    if (maintenance.status === 'Completed') {
      return NextResponse.json(
        { message: "Maintenance is already completed" },
        { status: 400 }
      );
    }

    // Find the associated bank
    const bank = await Bank.findById(maintenance.bankId);
    if (!bank) {
      return NextResponse.json(
        { message: "Associated bank not found" },
        { status: 404 }
      );
    }

    // Check if bank has sufficient balance
    if (bank.balance < maintenance.categoryAmount) {
      return NextResponse.json(
        { message: "Insufficient bank balance for maintenance expense" },
        { status: 400 }
      );
    }

    // Start transaction-like operations
    const session = await connectDB().then(db => db.startSession());
    
    try {
      await session.withTransaction(async () => {
        // 1. Update maintenance record status to Completed
        await Maintenance.findByIdAndUpdate(
          maintenanceId,
          {
            status: 'Completed',
            completedAt: new Date(),
            notificationStatus: 'Accepted'
          },
          { session }
        );

        // 2. Update bank balance
        const newBalance = bank.balance - maintenance.categoryAmount;
        await Bank.findByIdAndUpdate(
          maintenance.bankId,
          { balance: newBalance },
          { session }
        );

        // 3. Create expense record
        const expenseData = {
          appUserId: maintenance.appUserId._id,
          bankId: maintenance.bankId,
          bankName: maintenance.bankName,
          category: `Maintenance - ${maintenance.category}`,
          amount: maintenance.categoryAmount,
          description: `Vehicle maintenance for ${maintenance.vehicleNumber} - ${maintenance.category}`,
          date: new Date(),
          createdBy: maintenance.createdBy,
          maintenanceId: maintenanceId // Link to maintenance record
        };

        const expense = new Expense(expenseData);
        await expense.save({ session });

        // 4. Create transaction record for bank balance update
        const transactionData = {
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          appUserId: maintenance.appUserId._id,
          fromBankId: maintenance.bankId,
          type: 'EXPENSE',
          amount: maintenance.categoryAmount,
          description: `Maintenance expense - ${maintenance.vehicleNumber} ${maintenance.category}`,
          category: 'Maintenance',
          date: new Date(),
          relatedEntityId: expense._id,
          relatedEntityType: 'Expense'
        };

        const transaction = new Transaction(transactionData);
        await transaction.save({ session });

        return {
          maintenance: await Maintenance.findById(maintenanceId).session(session),
          expense,
          transaction,
          updatedBankBalance: newBalance
        };
      });

      // Fetch updated records to return
      const updatedMaintenance = await Maintenance.findById(maintenanceId)
        .populate('appUserId')
        .populate('vehicleId');

      const updatedBank = await Bank.findById(maintenance.bankId);

      return NextResponse.json({
        message: "Maintenance accepted and processed successfully",
        data: {
          maintenance: updatedMaintenance,
          bankBalance: updatedBank.balance,
          expenseCreated: true,
          transactionCreated: true
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error("Error accepting maintenance:", error);
    return NextResponse.json(
      { message: "Failed to accept maintenance", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}