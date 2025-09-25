import { NextRequest, NextResponse } from 'next/server';
import connectDB from "@/lib/mongodb";
import Trip from '@/models/Trip';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import Customer from '@/models/Customer';
import Bank from '@/models/Bank';
import FuelTracking from '@/models/FuelTracking';
import DriverBudget from '@/models/DriverBudget';
import Invoice from '@/models/Invoice';
import Income from '@/models/Income';
import Attendance from '@/models/Attendance';
import Transaction from '@/models/Transaction';
import AppUser from '@/models/AppUser';

// GET - Fetch all trips
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const driverId = searchParams.get('driverId');
    const vehicleId = searchParams.get('vehicleId');
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (driverId) filter.driverId = driverId;
    if (vehicleId) filter.vehicleId = vehicleId;
    
    const trips = await Trip.find(filter)
      .populate('driverId', 'name')
      .populate('vehicleId', 'vehicleNumber')
      .populate('createdBy', 'name')
      .populate('routeWiseExpenseBreakdown.bankId', 'name')
      .populate('routeWiseExpenseBreakdown.customerId', 'name')
      .populate('routeWiseExpenseBreakdown.userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Trip.countDocuments(filter);
    
    return NextResponse.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}

// POST - Create new trip
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.createdBy) {
      return NextResponse.json(
        { error: 'createdBy field is required' },
        { status: 400 }
      );
    }
    
    // Generate trip ID
    const tripCount = await Trip.countDocuments();
    const tripId = `TRIP${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(tripCount + 1).padStart(3, '0')}`;
    
    // Get vehicle's latest fuel tracking record
    const latestFuelRecord = await FuelTracking.findOne({ vehicleId: body.vehicleId })
      .sort({ createdAt: -1 });
    
    if (!latestFuelRecord) {
      return NextResponse.json(
        { error: 'No fuel tracking record found for this vehicle' },
        { status: 400 }
      );
    }
    
    // Calculate fuel needed and diesel cost
    const totalKm = body.endKm - body.startKm;
    const fuelNeededForTrip = totalKm / (latestFuelRecord.truckAverage || 1);
    const tripDiselCost = fuelNeededForTrip * latestFuelRecord.fuelRate;
    
    // Calculate required fields
    const tripRouteCost = body.routeWiseExpenseBreakdown.reduce((sum: number, route: any) => sum + route.routeAmount, 0);
    const tripExpenses = body.routeWiseExpenseBreakdown.reduce((sum: number, route: any) => {
      return sum + route.expenses.reduce((expSum: number, exp: any) => expSum + exp.total, 0);
    }, 0);
    const remainingAmount = tripRouteCost - tripExpenses - tripDiselCost;

    // Create trip
    const tripData = {
      ...body,
      tripId,
      totalKm,
      fuelNeededForTrip,
      tripDiselCost,
      tripFuelQuantity: fuelNeededForTrip,
      totalTripKm: totalKm,
      tripRouteCost,
      tripExpenses,
      remainingAmount,
      createdBy: body.createdBy // Use the createdBy from request body
    };
    
    const trip = new Trip(tripData);
    await trip.save();
    
    // Calculate total expenses from all routes
    const totalExpenses = tripExpenses;
    
    // Update driver budget - minus total expenses from remaining budget
    const driverBudget = await DriverBudget.findOne({ driverId: body.driverId })
      .sort({ createdAt: -1 });
    
    if (driverBudget) {
      const newRemainingBudget = driverBudget.dailyBudgetAmount - totalExpenses;
      
      // Update the driver budget with new remaining amount
      await DriverBudget.findByIdAndUpdate(driverBudget._id, {
        dailyBudgetAmount: newRemainingBudget
      });
    }
    
    // Update fuel quantity in fuel tracking - minus trip fuel quantity
    await FuelTracking.findByIdAndUpdate(latestFuelRecord._id, {
      $inc: { fuelQuantity: -fuelNeededForTrip }
    });
    
    // Generate route-wise invoices and conditionally create income/transactions based on status
    for (const route of body.routeWiseExpenseBreakdown) {
      // Create Invoice (always created, but status depends on trip status)
      const invoiceCount = await Invoice.countDocuments();
      const invoiceNumber = `INV${new Date().getFullYear()}${String(invoiceCount + 1).padStart(4, '0')}`;
      
      const invoice = await Invoice.create({
        date: body.date[0],
        from: route.startLocation,
        to: route.endLocation,
        customerName: route.customerName,
        lrNo: `LR${tripId}${route.routeNumber}`,
        rows: [{
          product: route.productName,
          truckNo: body.vehicleNumber,
          weight: route.weight,
          rate: route.rate,
          total: route.routeAmount
        }],
        total: route.routeAmount,
        status: body.status === 'Completed' ? 'Unpaid' : 'Pending'
      });
      
      // Only create income, transactions, and bank updates if trip status is 'Completed'
      if (body.status === 'Completed') {
        // Create Income record
        const income = await Income.create({
          appUserId: route.userId,
          date: body.date[0],
          category: 'Trip Income',
          amount: route.routeAmount,
          description: `Income from trip ${tripId} - Route ${route.routeNumber}`,
          bankId: route.bankId
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
          description: `Income from trip ${tripId} - Route ${route.routeNumber}`,
          amount: route.routeAmount,
          toBankId: route.bankId,
          appUserId: route.userId,
          relatedEntityId: income._id,
          relatedEntityType: 'Income',
          category: 'Trip Income',
          status: 'COMPLETED',
          balanceAfter,
          date: body.date[0]
        });
        
        // Update bank balance based on selected app user and bank
        await Bank.findByIdAndUpdate(route.bankId, {
          $inc: { balance: route.routeAmount }
        });
        
        // Create Transaction record for bank balance update
        transactionCount = await Transaction.countDocuments();
        const bankTransactionId = `TXN${new Date().getFullYear()}${String(transactionCount + 1).padStart(6, '0')}`;
        
        await Transaction.create({
          transactionId: bankTransactionId,
          type: 'BANK_UPDATE',
          description: `Bank balance update for trip ${tripId} - Route ${route.routeNumber}`,
          amount: route.routeAmount,
          toBankId: route.bankId,
          appUserId: route.userId,
          relatedEntityId: route.bankId,
          relatedEntityType: 'Bank',
          category: 'Bank Update',
          status: 'COMPLETED',
          balanceAfter,
          date: body.date[0]
        });
      }
      
      // Note: Expense records are not created here as expenses are already deducted from driver budget
    }
    
    // If status is completed, create attendance records
    if (body.status === 'Completed') {
      await createAttendanceRecords(body, trip._id, tripId);
    } else {
      // Always create attendance records for all trip dates regardless of status
      await createAttendanceRecords(body, trip._id, tripId);
    }
    
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}

// Helper function to create attendance records
async function createAttendanceRecords(tripData: any, tripObjectId: any, tripId: string) {
  try {
    // Get the month and year from the first trip date
    const firstTripDate = new Date(tripData.date[0]);
    const month = firstTripDate.getMonth();
    const year = firstTripDate.getFullYear();
    
    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create a set of trip dates for quick lookup
    const tripDates = new Set(
      tripData.date.map((date: string) => new Date(date).getDate())
    );
    
    // Process all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      
      const existingAttendance = await Attendance.findOne({
        driverId: tripData.driverId,
        date: currentDate
      });
      
      if (!existingAttendance) {
        let status: 'Present' | 'Absent' | 'On Trip';
        let attendanceData: any = {
          driverId: tripData.driverId,
          driverName: tripData.driverName,
          date: currentDate,
          createdBy: tripData.createdBy
        };
        
        if (tripDates.has(day)) {
          // Trip date - set as both Present and On Trip
          status = 'Present';
          attendanceData.status = status;
          attendanceData.tripId = tripObjectId;
          attendanceData.tripNumber = tripId;
          attendanceData.remarks = 'On Trip';
        } else {
          // Non-trip date - set as Absent
          status = 'Absent';
          attendanceData.status = status;
        }
        
        await Attendance.create(attendanceData);
      }
    }
  } catch (error) {
    console.error('Error creating attendance records:', error);
    throw error;
  }
}

// Helper function to create records when trip is completed
async function createCompletedTripRecords(trip: any) {
  try {
    // Create attendance records for each trip date
    await createAttendanceRecords(trip, trip._id, trip.tripId);
    
    // Create route-wise invoices, income, expense records and transactions
    for (const route of trip.routeWiseExpenseBreakdown) {
      // Create Invoice
      const invoiceCount = await Invoice.countDocuments();
      const invoiceNumber = `INV${new Date().getFullYear()}${String(invoiceCount + 1).padStart(4, '0')}`;
      
      const invoice = await Invoice.create({
        date: trip.date[0],
        from: route.startLocation,
        to: route.endLocation,
        customerName: route.customerName,
        lrNo: `LR${trip.tripId}${route.routeNumber}`,
        rows: [{
          product: route.productName,
          truckNo: trip.vehicleNumber,
          weight: route.weight,
          rate: route.rate,
          total: route.routeAmount
        }],
        total: route.routeAmount,
        status: 'Unpaid'
      });
      
      // Create Income record
      const income = await Income.create({
        appUserId: route.userId,
        date: trip.date[0],
        category: 'Trip Income',
        amount: route.routeAmount,
        description: `Income from trip ${trip.tripId} - Route ${route.routeNumber}`,
        bankId: route.bankId
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
      
      // Note: Expense records are not created here as expenses are already deducted from driver budget
    }
  } catch (error) {
    console.error('Error creating completed trip records:', error);
    throw error;
  }
}