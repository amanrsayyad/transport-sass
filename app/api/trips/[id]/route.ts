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
    
    return NextResponse.json(trip);
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
    
    // If vehicle changed, recalculate fuel-related fields
    if (body.vehicleId !== existingTrip.vehicleId.toString()) {
      const latestFuelRecord = await FuelTracking.findOne({ vehicleId: body.vehicleId })
        .sort({ createdAt: -1 });
      
      if (latestFuelRecord) {
        const totalKm = body.endKm - body.startKm;
        body.fuelNeededForTrip = totalKm / latestFuelRecord.mileage;
        body.tripDiselCost = body.fuelNeededForTrip * latestFuelRecord.fuelRate;
        body.totalTripKm = totalKm;
      }
    }
    
    const wasCompleted = existingTrip.status === 'Completed';
    const isNowCompleted = body.status === 'Completed';
    
    // Update trip
    const updatedTrip = await Trip.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );
    
    // Handle completion status change
    if (!wasCompleted && isNowCompleted) {
      // Trip just became completed - create related records
      await createCompletedTripRecords(updatedTrip);
      // Update maintenance km tracking
      await updateMaintenanceKmTracking(updatedTrip.vehicleId, updatedTrip.endKm);
    } else if (wasCompleted && !isNowCompleted) {
      // Trip was uncompleted - remove related records
      await removeCompletedTripRecords(updatedTrip);
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
    
    // Create route-wise records (invoices, income, expenses)
    for (const route of trip.routeWiseExpenseBreakdown) {
      // Create Invoice
      const invoiceCount = await Invoice.countDocuments();
      const invoiceNumber = `INV${new Date().getFullYear()}${String(invoiceCount + 1).padStart(4, '0')}`;
      
      const invoice = await Invoice.create({
        invoiceNumber,
        customerId: route.customerId,
        customerName: route.customerName,
        date: trip.date[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        rows: [{
          description: `${route.productName} - ${route.startLocation} to ${route.endLocation}`,
          weight: route.weight,
          rate: route.rate,
          total: route.routeAmount
        }],
        subtotal: route.routeAmount,
        total: route.routeAmount,
        status: 'Unpaid',
        tripId: trip._id,
        createdBy: trip.createdBy
      });
      
      // Create Income record
      const income = await Income.create({
        date: trip.date[0],
        category: 'Trip Income',
        amount: route.routeAmount,
        description: `Income from trip ${trip.tripId} - Route ${route.routeNumber}`,
        bankId: route.bankId,
        bankName: route.bankName,
        invoiceId: invoice._id,
        tripId: trip._id,
        createdBy: trip.createdBy
      });
      
      // Create Transaction record for income
      let transactionCount = await Transaction.countDocuments();
      const transactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;
      
      // Get current bank balance before update
      const bank = await Bank.findById(route.bankId);
      const balanceAfter = (bank?.balance || 0) + route.routeAmount;
      
      await Transaction.create({
        transactionId,
        type: 'INCOME',
        description: `Income from trip ${trip.tripId} - Route ${route.routeNumber}`,
        amount: route.routeAmount,
        toBankId: route.bankId,
        appUserId: route.userId,
        relatedEntityId: income._id,
        relatedEntityType: 'Income',
        category: 'Trip Income',
        status: 'COMPLETED',
        balanceAfter,
        date: trip.date[0]
      });
      
      // Update bank balance
      await Bank.findByIdAndUpdate(route.bankId, {
        $inc: { balance: route.routeAmount }
      });
      
      // Create Transaction record for bank balance update
      transactionCount = await Transaction.countDocuments();
      const bankTransactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;
      
      await Transaction.create({
        transactionId: bankTransactionId,
        type: 'BANK_UPDATE',
        description: `Bank balance update for trip ${trip.tripId} - Route ${route.routeNumber}`,
        amount: route.routeAmount,
        toBankId: route.bankId,
        appUserId: route.userId,
        relatedEntityId: route.bankId,
        relatedEntityType: 'Bank',
        category: 'Bank Update',
        status: 'COMPLETED',
        balanceAfter,
        date: trip.date[0]
      });
      
      // Create Expense records
      for (const expense of route.expenses) {
        await Expense.create({
          date: trip.date[0],
          category: expense.category,
          amount: expense.total,
          description: expense.description || `${expense.category} for trip ${trip.tripId}`,
          bankId: route.bankId,
          bankName: route.bankName,
          tripId: trip._id,
          createdBy: trip.createdBy
        });
      }
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