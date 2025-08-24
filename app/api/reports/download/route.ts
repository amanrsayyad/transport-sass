import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Income from '@/models/Income';
import Expense from '@/models/Expense';
import DriverBudget from '@/models/DriverBudget';
import Transaction from '@/models/Transaction';
import BankTransfer from '@/models/BankTransfer';
import Invoice from '@/models/Invoice';
import FuelTracking from '@/models/FuelTracking';
import Trip from '@/models/Trip';
import Attendance from '@/models/Attendance';
import Maintenance from '@/models/Maintenance';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import AppUser from '@/models/AppUser';
import Bank from '@/models/Bank';
import Customer from '@/models/Customer';
// import PDFDocument from 'pdfkit'; // Removed due to font loading issues
import ExcelJS from 'exceljs';

interface FilterOptions {
  fromDate: string;
  toDate: string;
  userId?: string;
  bankId?: string;
  modules: string[];
  format: 'pdf' | 'excel';
}

interface ReportData {
  [key: string]: any[];
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filters: FilterOptions = {
      fromDate: searchParams.get('fromDate') || '',
      toDate: searchParams.get('toDate') || '',
      userId: searchParams.get('userId') || undefined,
      bankId: searchParams.get('bankId') || undefined,
      modules: searchParams.get('modules')?.split(',') || [],
      format: (searchParams.get('format') as 'pdf' | 'excel') || 'pdf'
    };

    if (!filters.fromDate || !filters.toDate || filters.modules.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromDate, toDate, and modules' },
        { status: 400 }
      );
    }

    // Build date filter
    const dateFilter = {
      createdAt: {
        $gte: new Date(filters.fromDate),
        $lte: new Date(new Date(filters.toDate).setHours(23, 59, 59, 999))
      }
    };

    // Build additional filters
    const additionalFilters: any = {};
    if (filters.userId) additionalFilters.appUserId = filters.userId;
    if (filters.bankId) additionalFilters.bankId = filters.bankId;

    const reportData: ReportData = {};

    // Fetch data for each selected module
    for (const module of filters.modules) {
      const moduleFilter = { ...dateFilter, ...additionalFilters };
      
      switch (module) {
        case 'income':
          reportData.income = await Income.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('bankId', 'bankName')
            .sort({ createdAt: -1 });
          break;
          
        case 'expenses':
          reportData.expenses = await Expense.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('bankId', 'bankName')
            .sort({ createdAt: -1 });
          break;
          
        case 'driver-budgets':
          reportData.driverBudgets = await DriverBudget.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('bankId', 'bankName')
            .populate('driverId', 'name')
            .sort({ createdAt: -1 });
          break;
          
        case 'transactions':
          reportData.transactions = await Transaction.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('fromBankId', 'bankName')
            .populate('toBankId', 'bankName')
            .sort({ createdAt: -1 });
          break;
          
        case 'bank-transfers':
          reportData.bankTransfers = await BankTransfer.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('fromBankId', 'bankName')
            .populate('toBankId', 'bankName')
            .sort({ createdAt: -1 });
          break;
          
        case 'invoices':
          reportData.invoices = await Invoice.find(moduleFilter)
            .populate('appUserId', 'name')
            .sort({ createdAt: -1 });
          break;
          
        case 'fuel-tracking':
          reportData.fuelTracking = await FuelTracking.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('bankId', 'bankName')
            .populate('vehicleId', 'vehicleNumber')
            .sort({ createdAt: -1 });
          break;
          
        case 'trips':
          reportData.trips = await Trip.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('vehicleId', 'vehicleNumber')
            .populate('driverId', 'name')
            .populate('routeWiseExpenseBreakdown.customerId', 'name')
            .sort({ createdAt: -1 });
          break;
          
        case 'attendance':
          reportData.attendance = await Attendance.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('driverId', 'name')
            .sort({ createdAt: -1 });
          break;
          
        case 'maintenance':
          reportData.maintenance = await Maintenance.find(moduleFilter)
            .populate('appUserId', 'name')
            .populate('vehicleId', 'vehicleNumber')
            .sort({ createdAt: -1 });
          break;
          
        case 'vehicles':
          reportData.vehicles = await Vehicle.find()
            .populate('appUserId', 'name')
            .sort({ createdAt: -1 });
          break;
          
        case 'drivers':
          reportData.drivers = await Driver.find()
            .populate('appUserId', 'name')
            .sort({ createdAt: -1 });
          break;
      }
    }

    // Generate report based on format
    if (filters.format === 'pdf') {
      const textBuffer = await generatePDFReport(reportData, filters);
      return new NextResponse(textBuffer, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="transport-report-${filters.fromDate}-to-${filters.toDate}.txt"`
        }
      });
    } else {
      const excelBuffer = await generateExcelReport(reportData, filters);
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="transport-report-${filters.fromDate}-to-${filters.toDate}.xlsx"`
        }
      });
    }
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generatePDFReport(data: ReportData, filters: FilterOptions): Promise<Buffer> {
  // Due to font loading issues with PDFKit, we'll return a formatted text report
  // that can be saved as a .txt file instead of PDF
  console.log('PDF generation requested, returning formatted text report due to PDFKit font issues');
  
  const textReport = generateTextReport(data, filters);
  return Buffer.from(textReport, 'utf-8');
}

function generateTextReport(data: ReportData, filters: FilterOptions): string {
  let report = `TRANSPORT MANAGEMENT SYSTEM REPORT\n`;
  report += `Report Period: ${filters.fromDate} to ${filters.toDate}\n`;
  report += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
  
  report += `EXECUTIVE SUMMARY\n`;
  report += `================\n\n`;
  
  let totalIncome = 0;
  let totalExpenses = 0;
  
  if (data.income) {
    totalIncome = data.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    report += `Total Income: $${totalIncome.toFixed(2)}\n`;
  }
  
  if (data.expenses) {
    totalExpenses = data.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    report += `Total Expenses: $${totalExpenses.toFixed(2)}\n`;
  }
  
  report += `Net Profit/Loss: $${(totalIncome - totalExpenses).toFixed(2)}\n\n`;
  
  // Add detailed sections for each module
  Object.keys(data).forEach(module => {
    if (data[module] && data[module].length > 0) {
      report += `${module.toUpperCase()} DETAILS\n`;
      report += `${'='.repeat(module.length + 8)}\n`;
      
      data[module].forEach((item: any, index: number) => {
        report += `${index + 1}. `;
        if (item.description) report += `${item.description} - `;
        if (item.amount) report += `$${item.amount.toFixed(2)} `;
        if (item.date) report += `(${new Date(item.date).toLocaleDateString()})`;
        report += `\n`;
      });
      report += `\n`;
    }
  });
  
  return report;
}

async function generateExcelReport(data: ReportData, filters: FilterOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Transport Management System Report']);
  summarySheet.addRow([`Report Period: ${filters.fromDate} to ${filters.toDate}`]);
  summarySheet.addRow([`Generated on: ${new Date().toLocaleDateString()}`]);
  summarySheet.addRow([]);
  
  let totalIncome = 0;
  let totalExpenses = 0;
  
  if (data.income) {
    totalIncome = data.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    summarySheet.addRow(['Total Income', totalIncome]);
  }
  
  if (data.expenses) {
    totalExpenses = data.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    summarySheet.addRow(['Total Expenses', totalExpenses]);
  }
  
  summarySheet.addRow(['Net Profit/Loss', totalIncome - totalExpenses]);
  
  // Individual sheets for each module
  Object.entries(data).forEach(([module, records]) => {
    if (records && records.length > 0) {
      const sheet = workbook.addWorksheet(module.charAt(0).toUpperCase() + module.slice(1));
      
      // Add headers based on module type
      let headers: string[] = [];
      
      switch (module) {
        case 'income':
          headers = ['Date', 'Amount', 'Customer', 'Payment Type', 'Bank', 'User', 'Description'];
          break;
        case 'expenses':
          headers = ['Date', 'Amount', 'Description', 'Payment Type', 'Bank', 'User'];
          break;
        case 'driver-budgets':
          headers = ['Date', 'Driver', 'Amount', 'Payment Type', 'Bank', 'User'];
          break;
        case 'transactions':
          headers = ['Date', 'Type', 'Amount', 'Description', 'Bank', 'User'];
          break;
        case 'bank-transfers':
          headers = ['Date', 'From Bank', 'To Bank', 'Amount', 'User'];
          break;
        case 'invoices':
          headers = ['Date', 'Invoice Number', 'Customer', 'Amount', 'Status', 'User'];
          break;
        case 'fuel-tracking':
          headers = ['Date', 'Vehicle', 'Fuel Quantity', 'Fuel Rate', 'Total Cost', 'Payment Type', 'Bank', 'User'];
          break;
        case 'trips':
          headers = ['Date', 'Trip ID', 'Vehicle', 'Driver', 'Start KM', 'End KM', 'Total KM', 'Route Cost', 'Expenses'];
          break;
        case 'attendance':
          headers = ['Date', 'Driver', 'Check In', 'Check Out', 'Status', 'User'];
          break;
        case 'maintenance':
          headers = ['Date', 'Vehicle', 'Type', 'Description', 'Cost', 'Status', 'User'];
          break;
        case 'vehicles':
          headers = ['Vehicle Number', 'Model', 'Year', 'Status', 'User'];
          break;
        case 'drivers':
          headers = ['Name', 'License Number', 'Phone', 'Status', 'User'];
          break;
        default:
          headers = ['Date', 'Data'];
      }
      
      sheet.addRow(headers);
      
      // Add data rows
      records.forEach(record => {
        let row: any[] = [];
        
        switch (module) {
          case 'income':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.amount,
              record.customerId?.name || 'N/A',
              record.paymentType || 'N/A',
              record.bankId?.bankName || 'N/A',
              record.appUserId?.name || 'N/A',
              record.description || ''
            ];
            break;
          case 'expenses':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.amount,
              record.description,
              record.paymentType || 'N/A',
              record.bankId?.bankName || 'N/A',
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'driver-budgets':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.driverId?.name || 'N/A',
              record.dailyBudgetAmount,
              record.paymentType || 'N/A',
              record.bankId?.bankName || 'N/A',
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'transactions':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.type,
              record.amount,
              record.description,
              record.bankId?.bankName || 'N/A',
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'bank-transfers':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.fromBankId?.bankName || 'N/A',
              record.toBankId?.bankName || 'N/A',
              record.amount,
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'invoices':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.invoiceNumber,
              record.customerId?.name || 'N/A',
              record.totalAmount,
              record.status,
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'fuel-tracking':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.vehicleId?.vehicleNumber || 'N/A',
              record.fuelQuantity,
              record.fuelRate,
              record.totalCost,
              record.paymentType || 'N/A',
              record.bankId?.bankName || 'N/A',
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'trips':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.tripId,
              record.vehicleId?.vehicleNumber || 'N/A',
              record.driverId?.name || 'N/A',
              record.startKm,
              record.endKm,
              record.totalKm,
              record.tripRouteCost,
              record.tripExpenses
            ];
            break;
          case 'attendance':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.driverId?.name || 'N/A',
              record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A',
              record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A',
              record.status,
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'maintenance':
            row = [
              new Date(record.createdAt).toLocaleDateString(),
              record.vehicleId?.vehicleNumber || 'N/A',
              record.maintenanceType,
              record.description,
              record.cost || 0,
              record.status,
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'vehicles':
            row = [
              record.vehicleNumber,
              record.model,
              record.year,
              record.status,
              record.appUserId?.name || 'N/A'
            ];
            break;
          case 'drivers':
            row = [
              record.name,
              record.licenseNumber,
              record.phoneNumber,
              record.status,
              record.appUserId?.name || 'N/A'
            ];
            break;
          default:
            row = [new Date(record.createdAt).toLocaleDateString(), JSON.stringify(record)];
        }
        
        sheet.addRow(row);
      });
      
      // Auto-fit columns
      sheet.columns.forEach(column => {
        column.width = 15;
      });
    }
  });
  
  return await workbook.xlsx.writeBuffer() as unknown as Buffer;
}