import { NextRequest, NextResponse } from 'next/server';
import connectDB from "@/lib/mongodb";
import Trip from '@/models/Trip';
import FuelTracking from '@/models/FuelTracking';
import DriverBudget from '@/models/DriverBudget';
import Invoice from '@/models/Invoice';
import Income from '@/models/Income';
import Expense from '@/models/Expense';
import Attendance from '@/models/Attendance';
import Maintenance from '@/models/Maintenance';
import Transaction from '@/models/Transaction';
import Bank from '@/models/Bank';

// GET - Fetch single trip
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const trip = await Trip.findById(params.id)
      .populate('driverId', 'name')
      .populate('vehicleId', 'vehicleNumber')
      .populate('createdBy', 'name');
    
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    // Normalize routeWiseExpenseBreakdown to include advanceAmount in API response
    const obj = trip.toObject();
    obj.routeWiseExpenseBreakdown = (obj.routeWiseExpenseBreakdown || []).map((route: any) => ({
      ...route,
      advanceAmount: Number(route?.advanceAmount ?? 0),
    }));
    return NextResponse.json(obj);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}

// PUT - Update trip
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const existingTrip = await Trip.findById(params.id);
    
    if (!existingTrip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    // Validate route-wise breakdown if present
    if (Array.isArray(body.routeWiseExpenseBreakdown)) {
      for (let i = 0; i < body.routeWiseExpenseBreakdown.length; i++) {
        const r = body.routeWiseExpenseBreakdown[i];
        const missing: string[] = [];
        if (!r.customerId) missing.push('customerId');
        if (!r.userId) missing.push('userId');
        if (!r.bankId) missing.push('bankId');
        if (!r.paymentType) missing.push('paymentType');
        if (!r.startLocation) missing.push('startLocation');
        if (!r.endLocation) missing.push('endLocation');
        if (!r.productName) missing.push('productName');
        if (r.weight === undefined || r.weight === null) missing.push('weight');
        if (r.rate === undefined || r.rate === null) missing.push('rate');
        if (missing.length) {
          return NextResponse.json(
            { error: `Route ${i + 1} missing: ${missing.join(', ')}` },
            { status: 400 }
          );
        }
      }
    }

    // Normalize per-route totalExpense and advanceAmount; compute trip totals if body provides routes
    if (Array.isArray(body.routeWiseExpenseBreakdown)) {
      body.routeWiseExpenseBreakdown = body.routeWiseExpenseBreakdown.map((route: any) => {
        const totalExpense = Array.isArray(route.expenses)
          ? route.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.total) || 0), 0)
          : (route.totalExpense || 0);
        const advanceAmount = Number(route?.advanceAmount ?? 0);
        return { ...route, totalExpense, advanceAmount };
      });
      const tripRouteCost = body.routeWiseExpenseBreakdown.reduce((sum: number, r: any) => sum + (Number(r.routeAmount) || 0), 0);
      const tripExpenses = body.routeWiseExpenseBreakdown.reduce((sum: number, r: any) => sum + (Number(r.totalExpense) || 0), 0);
      const dieselCost = body.tripDiselCost ?? existingTrip.tripDiselCost;
      body.tripRouteCost = tripRouteCost;
      body.tripExpenses = tripExpenses;
      body.remainingAmount = tripRouteCost - tripExpenses - (dieselCost || 0);
    }

    // If vehicle changed, recalculate fuel-related fields
    if (body.vehicleId !== existingTrip.vehicleId.toString()) {
      const latestFuelRecord = await FuelTracking.findOne({ vehicleId: body.vehicleId })
        .sort({ createdAt: -1 });
      
      if (latestFuelRecord) {
        const totalKm = body.endKm - body.startKm;
        body.fuelNeededForTrip = totalKm / (latestFuelRecord.truckAverage || 1);
        body.tripDiselCost = body.fuelNeededForTrip * (latestFuelRecord.fuelRate || 0);
        body.totalTripKm = totalKm;
      }
    }
    
    // Track previous completed routes
    const prevCompletedRoutes = (existingTrip.routeWiseExpenseBreakdown || []).some((r: any) => r.routeStatus === 'Completed');

    // Update trip using document.save() to ensure nested subdocuments persist reliably
    existingTrip.set(body);
    await existingTrip.save();
    const updatedTrip = await Trip.findById(params.id);

    // Per-route side effects based on routeStatus
    const nowCompletedRoutes = (updatedTrip.routeWiseExpenseBreakdown || []).some((r: any) => r.routeStatus === 'Completed');

    for (const route of updatedTrip.routeWiseExpenseBreakdown) {
      const lrNo = `LR${updatedTrip.tripId}${route.routeNumber}`;
      const existingInvoice = await Invoice.findOne({ lrNo });
      const advanceAmount = Number(route.advanceAmount || 0);
      const remainingAmount = Math.max(0, Number(route.routeAmount || 0) - advanceAmount);
      const desiredInvoiceStatus = route.routeStatus === 'Completed' 
        ? (advanceAmount > 0 ? 'Unpaid' : 'Paid')
        : 'Unpaid';

      // Ensure invoice exists and mirrors route status
      if (existingInvoice) {
        let updated = false;
        if (existingInvoice.status !== desiredInvoiceStatus) {
          existingInvoice.status = desiredInvoiceStatus;
          updated = true;
        }
        // Always update advance and remaining on existing invoice to reflect latest route values
        if (existingInvoice.advanceAmount !== advanceAmount) {
          (existingInvoice as any).advanceAmount = advanceAmount;
          updated = true;
        }
        const currentRemaining = (existingInvoice as any).remainingAmount ?? 0;
        const newRemaining = remainingAmount;
        if (currentRemaining !== newRemaining) {
          (existingInvoice as any).remainingAmount = newRemaining;
          updated = true;
        }
        if (updated) {
          await existingInvoice.save();
        }
      } else {
        await Invoice.updateOne(
          { lrNo },
          {
            $set: {
              date: (route?.dates && route.dates[0]) ? route.dates[0] : ((updatedTrip.date && updatedTrip.date[0]) ? updatedTrip.date[0] : new Date()),
              from: route.startLocation,
              to: route.endLocation,
              customerName: route.customerName,
              lrNo,
              rows: [{
                product: route.productName,
                truckNo: updatedTrip.vehicleNumber,
                weight: route.weight,
                rate: route.rate,
                total: route.routeAmount
              }],
              total: route.routeAmount,
              advanceAmount,
              remainingAmount,
              status: desiredInvoiceStatus
            }
          },
          { upsert: true }
        );
      }

      // When a route is completed, generate income, transactions, and bank update if missing
      if (route.routeStatus === 'Completed') {
        const isAdvance = advanceAmount > 0;
        const incomeAmount = isAdvance ? advanceAmount : Number(route.routeAmount || 0);
        const incomeDesc = isAdvance
          ? `Advance income from trip ${updatedTrip.tripId} - Route ${route.routeNumber}`
          : `Income from trip ${updatedTrip.tripId} - Route ${route.routeNumber}`;

        // Create Income record if it doesn't already exist
        let income = await Income.findOne({
          appUserId: route.userId,
          date: (route?.dates && route.dates[0]) ? route.dates[0] : ((updatedTrip.date && updatedTrip.date[0]) ? updatedTrip.date[0] : new Date()),
          category: 'Trip Income',
          description: incomeDesc,
          bankId: route.bankId
        });

        if (!income) {
          income = await Income.create({
            appUserId: route.userId,
            date: (route?.dates && route.dates[0]) ? route.dates[0] : ((updatedTrip.date && updatedTrip.date[0]) ? updatedTrip.date[0] : new Date()),
            category: 'Trip Income',
            amount: incomeAmount,
            description: incomeDesc,
            bankId: route.bankId
          });
        }

        // Create INCOME transaction if missing
        const existingIncomeTxn = await Transaction.findOne({
          type: 'INCOME',
          description: incomeDesc,
          toBankId: route.bankId,
          appUserId: route.userId,
          relatedEntityType: 'Income',
          relatedEntityId: income._id
        });

        if (!existingIncomeTxn) {
          let transactionCount = await Transaction.countDocuments();
          const transactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;

          const bank = await Bank.findById(route.bankId);
          const balanceAfterIncome = (bank?.balance || 0) + incomeAmount;

          await Transaction.create({
            transactionId,
            type: 'INCOME',
            description: incomeDesc,
            amount: incomeAmount,
            toBankId: route.bankId,
            appUserId: route.userId,
            relatedEntityId: income._id,
            relatedEntityType: 'Income',
            category: 'Trip Income',
            status: 'COMPLETED',
            balanceAfter: balanceAfterIncome,
            date: (route?.dates && route.dates[0]) ? route.dates[0] : ((updatedTrip.date && updatedTrip.date[0]) ? updatedTrip.date[0] : new Date())
          });
        }

        // Create Bank update transaction and update bank balance if missing
        const bankUpdateDesc = `Bank balance update for trip ${updatedTrip.tripId} - Route ${route.routeNumber}`;

        const existingBankUpdateTxn = await Transaction.findOne({
          type: 'BANK_UPDATE',
          description: bankUpdateDesc,
          toBankId: route.bankId,
          appUserId: route.userId,
          relatedEntityType: 'Bank',
          relatedEntityId: route.bankId
        });

        if (!existingBankUpdateTxn) {
          await Bank.findByIdAndUpdate(route.bankId, {
            $inc: { balance: incomeAmount }
          });

          let transactionCount = await Transaction.countDocuments();
          const bankTransactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;

          const updatedBank = await Bank.findById(route.bankId);

          await Transaction.create({
            transactionId: bankTransactionId,
            type: 'BANK_UPDATE',
            description: bankUpdateDesc,
            amount: incomeAmount,
            toBankId: route.bankId,
            appUserId: route.userId,
            relatedEntityId: route.bankId,
            relatedEntityType: 'Bank',
            category: 'Bank Update',
            status: 'COMPLETED',
            balanceAfter: updatedBank?.balance || undefined,
            date: (route?.dates && route.dates[0]) ? route.dates[0] : ((updatedTrip.date && updatedTrip.date[0]) ? updatedTrip.date[0] : new Date())
          });
        }
      }
    }

    // Create attendance only when trip gains its first completed route
    if (!prevCompletedRoutes && nowCompletedRoutes) {
      for (const date of updatedTrip.date) {
        const existingAttendance = await Attendance.findOne({
          driverId: updatedTrip.driverId,
          date: new Date(date)
        });

        if (!existingAttendance) {
          await Attendance.create({
            driverId: updatedTrip.driverId,
            driverName: updatedTrip.driverName,
            date: new Date(date),
            status: 'Present',
            tripId: updatedTrip._id,
            tripNumber: updatedTrip.tripId,
            remarks: 'On Trip',
            createdBy: updatedTrip.createdBy
          });
        }
      }

      // Update maintenance km tracking when trip first has a completed route
      await updateMaintenanceKmTracking(updatedTrip.vehicleId, updatedTrip.endKm);
    }

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error('Error updating trip:', error);
    return NextResponse.json(
      { error: 'Failed to update trip' },
      { status: 500 }
    );
  }
}

// DELETE - Delete trip
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const trip = await Trip.findById(params.id);
    
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    // If trip was completed, remove related records
    if (trip.status === 'Completed') {
      await removeCompletedTripRecords(trip);
    }
    
    // Restore fuel quantity
    const latestFuelRecord = await FuelTracking.findOne({ vehicleId: trip.vehicleId })
      .sort({ createdAt: -1 });
    
    if (latestFuelRecord) {
      await FuelTracking.findByIdAndUpdate(latestFuelRecord._id, {
        $inc: { fuelQuantity: trip.fuelNeededForTrip }
      });
    }
    
    // Restore driver budget
    const driverBudget = await DriverBudget.findOne({ driverId: trip.driverId });
    if (driverBudget) {
      const nonDriverAllowanceExpenses = trip.routeWiseExpenseBreakdown.reduce((sum: number, route: any) => {
        return sum + route.expenses.reduce((expSum: number, exp: any) => {
          return exp.category !== 'Driver Allowance' ? expSum + exp.total : expSum;
        }, 0);
      }, 0);
      
      await DriverBudget.findByIdAndUpdate(driverBudget._id, {
        $inc: { remainingBudget: nonDriverAllowanceExpenses }
      });
    }
    
    await Trip.findByIdAndDelete(params.id);
    
    return NextResponse.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json(
      { error: 'Failed to delete trip' },
      { status: 500 }
    );
  }
}

// Helper functions
async function createCompletedTripRecords(trip: any) {
  try {
    // Create attendance records for each trip date
    for (const date of trip.date) {
      const existingAttendance = await Attendance.findOne({
        driverId: trip.driverId,
        date: new Date(date)
      });

      if (!existingAttendance) {
        await Attendance.create({
          driverId: trip.driverId,
          driverName: trip.driverName,
          date: new Date(date),
          status: 'Present',
          tripId: trip._id,
          tripNumber: trip.tripId,
          remarks: 'On Trip',
          createdBy: trip.createdBy
        });
      }
    }

    // For each route: update or create invoice reflecting advance, then create income and transactions
    for (const route of trip.routeWiseExpenseBreakdown) {
      const lrNo = `LR${trip.tripId}${route.routeNumber}`;

      // Try to find existing invoice created during trip creation
      const existingInvoice = await Invoice.findOne({ lrNo });
      const advanceAmount = Number(route.advanceAmount || 0);
      const remainingAmount = Math.max(0, Number(route.routeAmount || 0) - advanceAmount);
      const isAdvance = advanceAmount > 0;

      if (existingInvoice) {
        // Update invoice with advance and remaining; set status based on advance
        (existingInvoice as any).advanceAmount = advanceAmount;
        (existingInvoice as any).remainingAmount = remainingAmount;
        existingInvoice.status = isAdvance ? 'Unpaid' : 'Paid';
        await existingInvoice.save();
      } else {
        // Upsert a new invoice with advance and status based on advance
        await Invoice.updateOne(
          { lrNo },
          {
            $set: {
              date: trip.date[0],
              from: route.startLocation,
              to: route.endLocation,
              customerName: route.customerName,
              lrNo,
              rows: [{
                product: route.productName,
                truckNo: trip.vehicleNumber,
                weight: route.weight,
                rate: route.rate,
                total: route.routeAmount
              }],
              total: route.routeAmount,
              advanceAmount,
              remainingAmount,
              status: isAdvance ? 'Unpaid' : 'Paid'
            }
          },
          { upsert: true }
        );
      }

      // Create Income record
      const income = await Income.create({
        appUserId: route.userId,
        date: trip.date[0],
        category: 'Trip Income',
        amount: isAdvance ? advanceAmount : Number(route.routeAmount || 0),
        description: isAdvance
          ? `Advance income from trip ${trip.tripId} - Route ${route.routeNumber}`
          : `Income from trip ${trip.tripId} - Route ${route.routeNumber}`,
        bankId: route.bankId
      });

      // Create Transaction record for income
      let transactionCount = await Transaction.countDocuments();
      const transactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;

      // Get current bank balance before update
      const bank = await Bank.findById(route.bankId);
      const incomeAmount = isAdvance ? advanceAmount : Number(route.routeAmount || 0);
      const balanceAfterIncome = (bank?.balance || 0) + incomeAmount;

      await Transaction.create({
        transactionId,
        type: 'INCOME',
        description: isAdvance
          ? `Advance income from trip ${trip.tripId} - Route ${route.routeNumber}`
          : `Income from trip ${trip.tripId} - Route ${route.routeNumber}`,
        amount: incomeAmount,
        toBankId: route.bankId,
        appUserId: route.userId,
        relatedEntityId: income._id,
        relatedEntityType: 'Income',
        category: 'Trip Income',
        status: 'COMPLETED',
        balanceAfter: balanceAfterIncome,
        date: trip.date[0]
      });

      // Update bank balance and log bank update transaction
      await Bank.findByIdAndUpdate(route.bankId, {
        $inc: { balance: incomeAmount }
      });

      transactionCount = await Transaction.countDocuments();
      const bankTransactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;

      const updatedBank = await Bank.findById(route.bankId);

      await Transaction.create({
        transactionId: bankTransactionId,
        type: 'BANK_UPDATE',
        description: `Bank balance update for trip ${trip.tripId} - Route ${route.routeNumber}`,
        amount: incomeAmount,
        toBankId: route.bankId,
        appUserId: route.userId,
        relatedEntityId: route.bankId,
        relatedEntityType: 'Bank',
        category: 'Bank Update',
        status: 'COMPLETED',
        balanceAfter: updatedBank?.balance || balanceAfterIncome,
        date: trip.date[0]
      });
    }
  } catch (error) {
    console.error('Error creating completed trip records:', error);
    throw error;
  }
}

async function removeCompletedTripRecords(trip: any) {
  try {
    // Remove attendance records
    await Attendance.deleteMany({
      tripId: trip._id
    });
    
    // Remove invoices, income, and expense records
    await Invoice.deleteMany({ tripId: trip._id });
    await Income.deleteMany({ tripId: trip._id });
    await Expense.deleteMany({ tripId: trip._id });
  } catch (error) {
    console.error('Error removing completed trip records:', error);
    throw error;
  }
}

// Helper function to update maintenance km tracking
async function updateMaintenanceKmTracking(vehicleId: string, endKm: number) {
  try {
    // Find all pending maintenance records for this vehicle
    const maintenanceRecords = await Maintenance.find({
      vehicleId: vehicleId,
      isCompleted: false,
      status: { $in: ['Pending', 'Due', 'Overdue'] }
    });

    // Update each maintenance record with new end km and calculate status
    for (const maintenance of maintenanceRecords) {
      const totalKm = endKm - maintenance.startKm;
      let status = 'Pending';
      
      if (totalKm >= maintenance.targetKm) {
        status = 'Due';
      }
      
      // Update the maintenance record
      await Maintenance.findByIdAndUpdate(maintenance._id, {
        endKm: endKm,
        status: status,
        isNotificationSent: status === 'Due' ? false : maintenance.isNotificationSent
      });
    }
  } catch (error) {
    console.error('Error updating maintenance km tracking:', error);
    throw error;
  }
}