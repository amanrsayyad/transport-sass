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
import Customer from '@/models/Customer';
import Mechanic from '@/models/Mechanic';
import Bank from '@/models/Bank';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

interface ModuleConfig {
  model: any;
  populate?: string[];
  fields: { key: string; label: string; type?: 'currency' | 'date' | 'text' | 'number' }[];
  sheetName: string;
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  trips: {
    model: Trip,
    populate: ['driverId', 'vehicleId', 'routeWiseExpenseBreakdown.customerId', 'routeWiseExpenseBreakdown.userId', 'routeWiseExpenseBreakdown.bankId', 'createdBy'],
    fields: [
      { key: 'tripId', label: 'Trip ID', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'driverId._id', label: 'Driver ID', type: 'text' },
      { key: 'driverId.name', label: 'Driver Name', type: 'text' },
      { key: 'driverName', label: 'Driver Name (Direct)', type: 'text' },
      { key: 'vehicleId._id', label: 'Vehicle ID', type: 'text' },
      { key: 'vehicleNumber', label: 'Vehicle Number', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'startKm', label: 'Start KM', type: 'number' },
      { key: 'endKm', label: 'End KM', type: 'number' },
      { key: 'totalKm', label: 'Total KM', type: 'number' },
      { key: 'totalTripKm', label: 'Total Trip KM', type: 'number' },
      { key: 'tripRouteCost', label: 'Route Cost', type: 'currency' },
      { key: 'tripExpenses', label: 'Trip Expenses', type: 'currency' },
      { key: 'tripDiselCost', label: 'Diesel Cost', type: 'currency' },
      { key: 'fuelNeededForTrip', label: 'Fuel Needed (L)', type: 'number' },
      { key: 'remainingAmount', label: 'Remaining Amount', type: 'currency' },
      { key: 'remarks', label: 'Remarks', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.routeNumber', label: 'Route 1 - Route Number', type: 'number' },
      { key: 'routeWiseExpenseBreakdown.0.startLocation', label: 'Route 1 - Start Location', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.endLocation', label: 'Route 1 - End Location', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.productName', label: 'Route 1 - Product Name', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.weight', label: 'Route 1 - Weight', type: 'number' },
      { key: 'routeWiseExpenseBreakdown.0.rate', label: 'Route 1 - Rate', type: 'currency' },
      { key: 'routeWiseExpenseBreakdown.0.routeAmount', label: 'Route 1 - Route Amount', type: 'currency' },
      { key: 'routeWiseExpenseBreakdown.0.userId._id', label: 'Route 1 - User ID', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.userId.name', label: 'Route 1 - User Name', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.userName', label: 'Route 1 - User Name (Direct)', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.customerId._id', label: 'Route 1 - Customer ID', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.customerName', label: 'Route 1 - Customer Name', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.bankId._id', label: 'Route 1 - Bank ID', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.bankName', label: 'Route 1 - Bank Name', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.paymentType', label: 'Route 1 - Payment Type', type: 'text' },
      { key: 'routeWiseExpenseBreakdown.0.totalExpense', label: 'Route 1 - Total Expense', type: 'currency' },
      { key: 'createdBy', label: 'Created By', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' },
      { key: '__v', label: 'Version', type: 'number' }
    ],
    sheetName: 'Trips Data'
  },
  'vehicle-trip-report': {
    model: Trip,
    populate: ['vehicleId'],
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'vehicleNumber', label: 'Vehicle Number', type: 'text' },
      { key: 'remainingAmount', label: 'Remaining Amount', type: 'currency' },
    ],
    sheetName: 'Vehicle Trip Report'
  },
  customers: {
    model: Customer,
    fields: [
      { key: 'customerName', label: 'Customer Name', type: 'text' },
      { key: 'companyName', label: 'Company Name', type: 'text' },
      { key: 'mobileNo', label: 'Mobile Number', type: 'text' },
      { key: 'products.0.productName', label: 'Product Name', type: 'text' },
      { key: 'products.0.productRate', label: 'Product Rate', type: 'number' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ],
    sheetName: 'Customers Data'
  },
  drivers: {
    model: Driver,
    fields: [
      { key: 'name', label: 'Driver Name', type: 'text' },
      { key: 'mobileNo', label: 'Mobile Number', type: 'text' },
      { key: 'licenseNumber', label: 'License Number', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ],
    sheetName: 'Drivers Data'
  },
  vehicles: {
    model: Vehicle,
    fields: [
      { key: 'registrationNumber', label: 'Registration Number', type: 'text' },
      { key: 'vehicleType', label: 'Vehicle Type', type: 'text' },
      { key: 'vehicleWeight', label: 'Vehicle Weight', type: 'number' },
      { key: 'vehicleStatus', label: 'Vehicle Status', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'fuelType', label: 'Fuel Type', type: 'text' },
      { key: 'mileage', label: 'Mileage', type: 'number' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ],
    sheetName: 'Vehicles Data'
  },
  mechanics: {
    model: Mechanic,
    fields: [
      { key: 'name', label: 'Mechanic Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Mechanics Data'
  },
  income: {
    model: Income,
    populate: ['appUserId', 'bankId'],
    fields: [
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'bankId.bankName', label: 'Bank', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Income Data'
  },
  expenses: {
    model: Expense,
    populate: ['appUserId', 'bankId'],
    fields: [
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'bankId.bankName', label: 'Bank', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Expenses Data'
  },
  maintenance: {
    model: Maintenance,
    populate: ['vehicleId', 'appUserId'],
    fields: [
      { key: 'vehicleId.vehicleNumber', label: 'Vehicle Number', type: 'text' },
      { key: 'maintenanceType', label: 'Maintenance Type', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'cost', label: 'Cost', type: 'currency' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Maintenance Data'
  },
  invoices: {
    model: Invoice,
    fields: [
      { key: 'lrNo', label: 'LR Number', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'customerName', label: 'Customer Name', type: 'text' },
      { key: 'from', label: 'From', type: 'text' },
      { key: 'to', label: 'To', type: 'text' },
      { key: 'total', label: 'Total Amount', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'consignor', label: 'Consignor', type: 'text' },
      { key: 'consignee', label: 'Consignee', type: 'text' },
      { key: 'remarks', label: 'Remarks', type: 'text' },
      { key: 'rows.0.product', label: 'Product', type: 'text' },
      { key: 'rows.0.truckNo', label: 'Truck Number', type: 'text' },
      { key: 'rows.0.articles', label: 'Articles', type: 'text' },
      { key: 'rows.0.weight', label: 'Weight', type: 'number' },
      { key: 'rows.0.rate', label: 'Rate', type: 'currency' },
      { key: 'rows.0.total', label: 'Row Total', type: 'currency' },
      { key: 'rows.0.remarks', label: 'Row Remarks', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Invoices Data'
  },
  'fuel-tracking': {
    model: FuelTracking,
    populate: ['appUserId', 'bankId', 'vehicleId'],
    fields: [
      { key: 'vehicleId.vehicleNumber', label: 'Vehicle Number', type: 'text' },
      { key: 'startKm', label: 'Start KM', type: 'number' },
      { key: 'endKm', label: 'End KM', type: 'number' },
      { key: 'fuelQuantity', label: 'Fuel Quantity (L)', type: 'number' },
      { key: 'fuelRate', label: 'Fuel Rate', type: 'currency' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'paymentType', label: 'Payment Type', type: 'text' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'bankId.bankName', label: 'Bank', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Fuel Tracking Data'
  },
  transactions: {
    model: Transaction,
    populate: ['appUserId'],
    fields: [
      { key: 'type', label: 'Transaction Type', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Transactions Data'
  },
  transfers: {
    model: BankTransfer,
    populate: ['fromAppUserId', 'toAppUserId', 'fromBankId', 'toBankId'],
    fields: [
      { key: 'fromAppUserId.name', label: 'From User', type: 'text' },
      { key: 'fromBankId.bankName', label: 'From Bank', type: 'text' },
      { key: 'fromBankId.accountNumber', label: 'From Account Number', type: 'text' },
      { key: 'toAppUserId.name', label: 'To User', type: 'text' },
      { key: 'toBankId.bankName', label: 'To Bank', type: 'text' },
      { key: 'toBankId.accountNumber', label: 'To Account Number', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'transferDate', label: 'Transfer Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'transactionId', label: 'Transaction ID', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Bank Transfers Data'
  },
  banks: {
    model: Bank,
    populate: ['appUserId'],
    fields: [
      { key: 'bankName', label: 'Bank Name', type: 'text' },
      { key: 'accountNumber', label: 'Account Number', type: 'text' },
      { key: 'balance', label: 'Balance', type: 'currency' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Banks Data'
  },
  'driver-budgets': {
    model: DriverBudget,
    populate: ['appUserId', 'bankId', 'driverId'],
    fields: [
      { key: 'driverId.name', label: 'Driver Name', type: 'text' },
      { key: 'dailyBudgetAmount', label: 'Daily Budget Amount', type: 'currency' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'paymentType', label: 'Payment Type', type: 'text' },
      { key: 'appUserId.name', label: 'User', type: 'text' },
      { key: 'bankId.bankName', label: 'Bank', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ],
    sheetName: 'Driver Budgets Data'
  }
};

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) return '';
  
  // Handle arrays
  if (Array.isArray(value)) {
    // For date arrays, take the first date value
    if (type === 'date' && value.length > 0) {
      const dateValue = value[0];
      return dateValue instanceof Date ? dateValue.toLocaleDateString() : new Date(dateValue).toLocaleDateString();
    }
    
    // Handle other arrays (like products)
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        return Object.entries(item)
          .filter(([key, val]) => key !== '_id' && key !== '__v')
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
      }
      return item.toString();
    }).join(' | ');
  }
  
  switch (type) {
    case 'currency':
      return typeof value === 'number' ? `₹${value.toFixed(2)}` : value.toString();
    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : new Date(value).toLocaleDateString();
    case 'number':
      return typeof value === 'number' ? value.toString() : value.toString();
    default:
      return value.toString();
  }
}

// Helper to format a Date as local YYYY-MM-DD (avoids UTC shifts)
function formatYMDLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse date string strictly as local date (start of day)
function parseLocalDateParam(input: string | null): Date | null {
  if (!input) return null;
  // ISO YYYY-MM-DD from <input type="date">
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  // DD/MM/YYYY manual entry support
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) {
    const [d, m, y] = input.split('/').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { module: string } }
) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const module = params.module;
    
    // Validate module
    if (!MODULE_CONFIGS[module]) {
      return NextResponse.json(
        { error: `Module '${module}' is not supported` },
        { status: 400 }
      );
    }
    
    const config = MODULE_CONFIGS[module];

    // Build optional filters based on module
    const buildFilter = (moduleName: string, sp: URLSearchParams) => {
      const filter: any = {};
      switch (moduleName) {
        case 'trips': {
          const status = sp.get('status');
          const driverId = sp.get('driverId');
          const vehicleId = sp.get('vehicleId');
          const fromDate = sp.get('fromDate');
          const toDate = sp.get('toDate');

          if (status && status !== 'all') {
            filter.status = status;
          }
          if (driverId && driverId !== 'all') {
            filter.driverId = driverId;
          }
          if (vehicleId && vehicleId !== 'all') {
            filter.vehicleId = vehicleId;
          }

          // Align date filtering with invoices and trips API: use primary trip date
          if (fromDate || toDate) {
            const start = parseLocalDateParam(fromDate);
            const endStart = parseLocalDateParam(toDate);
            const range: any = {};
            if (start) range.$gte = start;
            if (endStart) {
              const end = new Date(endStart.getFullYear(), endStart.getMonth(), endStart.getDate(), 23, 59, 59, 999);
              range.$lte = end;
            }
            if (Object.keys(range).length) {
              filter['date.0'] = range;
            }
          }
          return filter;
        }
        case 'vehicle-trip-report': {
          const vehicleId = sp.get('vehicleId');
          const fromDate = sp.get('fromDate');
          const toDate = sp.get('toDate');

          if (vehicleId && vehicleId !== 'all') {
            filter.vehicleId = vehicleId;
          }
          if (fromDate || toDate) {
            const start = parseLocalDateParam(fromDate);
            const endStart = parseLocalDateParam(toDate);
            const range: any = {};
            if (start) range.$gte = start;
            if (endStart) {
              const end = new Date(endStart.getFullYear(), endStart.getMonth(), endStart.getDate(), 23, 59, 59, 999);
              range.$lte = end;
            }
            if (Object.keys(range).length) {
              filter['date.0'] = range;
            }
          }
          return filter;
        }
        case 'invoices': {
          const status = sp.get('status');
          const customerName = sp.get('customerName');
          const lrNo = sp.get('lrNo');
          const fromDate = sp.get('fromDate');
          const toDate = sp.get('toDate');
          if (status && status !== 'all') {
            filter.status = status;
          }
          if (customerName && customerName !== 'all') {
            filter.customerName = { $regex: customerName, $options: 'i' };
          }
          if (lrNo) {
            filter.lrNo = { $regex: lrNo, $options: 'i' };
          }
          if (fromDate || toDate) {
            filter.date = {};
            if (fromDate) filter.date.$gte = new Date(fromDate);
            if (toDate) {
              const end = new Date(toDate);
              end.setHours(23, 59, 59, 999);
              filter.date.$lte = end;
            }
          }
          return filter;
        }
        case 'transactions': {
          const type = sp.get('type');
          const fromDate = sp.get('fromDate');
          const toDate = sp.get('toDate');
          if (type && type !== 'all') {
            filter.type = type;
          }
          if (fromDate || toDate) {
            filter.date = {};
            if (fromDate) filter.date.$gte = new Date(fromDate);
            if (toDate) filter.date.$lte = new Date(toDate);
          }
          return filter;
        }
        default:
          return filter;
      }
    };

    const filter = buildFilter(module, searchParams);
    
    // Fetch data for the module with filters if any
    let query = config.model.find(filter);
    
    if (config.populate) {
      config.populate.forEach(field => {
        query = query.populate(field);
      });
    }
    
    const data = await query.sort({ createdAt: -1 });
    
    // Helper: ensure Web-compatible ArrayBuffer body
    const toArrayBuffer = (bytes: ArrayBuffer | Uint8Array): ArrayBuffer => {
      if (bytes instanceof ArrayBuffer) return bytes;
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      return ab;
    };

    if (format === 'excel') {
      const excelData = await generateModuleExcelReport(data, config, module);
      const excelArrayBuffer = toArrayBuffer(excelData);
      return new NextResponse(excelArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${module}-data-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else {
      // PDF format
      const pdfData = await generateModulePDFReport(data, config, module);
      const pdfArrayBuffer = toArrayBuffer(pdfData);
      return new NextResponse(pdfArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${module}-data-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }
    
  } catch (error) {
    console.error(`Error generating ${params.module} report:`, error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateModuleExcelReport(
  data: any[],
  config: ModuleConfig,
  moduleName: string
): Promise<ArrayBuffer | Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(config.sheetName);

  // Special pivot formatting for vehicle trip report
  if (moduleName === 'vehicle-trip-report') {
    // Collect unique vehicle numbers
    const vehicleNumbers = Array.from(new Set(
      (data || []).map((t: any) => t?.vehicleNumber).filter(Boolean)
    )).sort();

    // Group by primary date (date.0)
    const rowsByDate: Record<string, { date: Date; values: Record<string, number> }> = {};
    (data || []).forEach((t: any) => {
      const dateVal = Array.isArray(t?.date) ? t.date[0] : t?.date; // start date
      const d = dateVal ? new Date(dateVal) : null;
      const key = d ? formatYMDLocal(d) : 'Unknown';
      const veh = t?.vehicleNumber || 'Unknown';
      const rem = Number(t?.remainingAmount || 0);
      if (!rowsByDate[key]) {
        rowsByDate[key] = { date: d || new Date(), values: {} };
      }
      rowsByDate[key].values[veh] = (rowsByDate[key].values[veh] || 0) + rem;
    });

    // Header: Date + each vehicle (no Total Remaining column)
    const header = ['Date', ...vehicleNumbers];
    worksheet.addRow(header);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Body rows sorted by date
    const dateKeys = Object.keys(rowsByDate).sort();
    dateKeys.forEach(key => {
      const { date, values } = rowsByDate[key];
      const rowVals: (string | number | Date)[] = [];
      rowVals.push(date ? formatYMDLocal(date) : key);
      vehicleNumbers.forEach(v => {
        const val = Number(values[v] || 0);
        rowVals.push(Number(val.toFixed(2))); // two decimals
      });
      worksheet.addRow(rowVals);
    });

    // Add Grand Total row: per-vehicle sums (no overall grand-total column)
    const totalsRow: (string | number)[] = ['Grand Total'];
    vehicleNumbers.forEach(v => {
      let sum = 0;
      dateKeys.forEach(key => { sum += Number(rowsByDate[key].values[v] || 0); });
      totalsRow.push(Number(sum.toFixed(2)));
    });
    worksheet.addRow(totalsRow);

    // Column widths
    worksheet.columns.forEach((column, idx) => {
      column.width = idx === 0 ? 14 : 18;
    });

    worksheet.addRow([]);
    worksheet.addRow([`Total records: ${data.length}`]);
    worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);

      return await workbook.xlsx.writeBuffer();
  }

  // Default tabular output
  const headers = config.fields.map(field => field.label);
  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  (data || []).forEach(item => {
    const row = config.fields.map(field => {
      const value = getNestedValue(item, field.key);
      return formatValue(value, field.type);
    });
    worksheet.addRow(row);
  });

  worksheet.columns.forEach(column => { column.width = 15; });

  worksheet.addRow([]);
  worksheet.addRow([`Total ${moduleName} records: ${data.length}`]);
  worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);

  return await workbook.xlsx.writeBuffer();
}

async function generateModulePDFReport(
  data: any[],
  config: ModuleConfig,
  moduleName: string
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        // Convert Node Buffer to Uint8Array for BodyInit compatibility
        const pdfBytes = new Uint8Array(pdfBuffer);
        resolve(pdfBytes);
      });
      
      // Title and metadata
      doc.fontSize(20).text(config.sheetName, 50, doc.y, { align: 'center', width: doc.page.width - 100 });
      doc.moveDown();
      doc.fontSize(12)
         .text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.y, { align: 'left', width: doc.page.width - 100 })
         .text(`Total records: ${data.length}`, 50, doc.y, { align: 'left', width: doc.page.width - 100 });
      doc.moveDown();

      if (data.length === 0) {
        doc.text('No data available', 50, doc.y, { align: 'center', width: doc.page.width - 100 });
        doc.end();
        return;
      }

      // Special pivot formatting for vehicle-trip-report
      if (moduleName === 'vehicle-trip-report') {
        const vehicleNumbers = Array.from(new Set(
          (data || []).map((t: any) => t?.vehicleNumber).filter(Boolean)
        )).sort();
        const rowsByDate: Record<string, { date: Date; values: Record<string, number> }> = {};
        (data || []).forEach((t: any) => {
          const dateVal = Array.isArray(t?.date) ? t.date[0] : t?.date;
          const d = dateVal ? new Date(dateVal) : null;
          const key = d ? formatYMDLocal(d) : 'Unknown';
          const veh = t?.vehicleNumber || 'Unknown';
          const rem = Number(t?.remainingAmount || 0);
          if (!rowsByDate[key]) {
            rowsByDate[key] = { date: d || new Date(), values: {} };
          }
          rowsByDate[key].values[veh] = (rowsByDate[key].values[veh] || 0) + rem;
        });

        const headers = ['Date', ...vehicleNumbers];
        const pageWidth = doc.page.width - 100; // margins
        const columnWidth = Math.min(pageWidth / headers.length, 100);

        let y = doc.y;
        doc.fontSize(10).fillColor('black');
        headers.forEach((label, i) => {
          const x = 50 + (i * columnWidth);
          doc.rect(x, y, columnWidth, 20).fillAndStroke('#f0f0f0', '#000000').fillColor('black')
             .text(label, x + 5, y + 5, { width: columnWidth - 10, height: 20, ellipsis: true });
        });
        y += 20;

        const dateKeys = Object.keys(rowsByDate).sort();
        dateKeys.forEach((key, rowIndex) => {
          if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
          const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';
      const { date, values } = rowsByDate[key];
      const rowVals: (string | number)[] = [];
      rowVals.push(formatYMDLocal(date || new Date()));
          vehicleNumbers.forEach(v => {
            const val = Number(values[v] || 0);
            rowVals.push(Number(val.toFixed(2)));
          });

          rowVals.forEach((val, i) => {
            const x = 50 + (i * columnWidth);
            doc.rect(x, y, columnWidth, 20).fillAndStroke(fillColor, '#cccccc').fillColor('black')
               .text(String(val), x + 5, y + 5, { width: columnWidth - 10, height: 20, ellipsis: true });
          });
          y += 20;
        });

        // Grand Total row
        if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
        const totals: (string | number)[] = ['Grand Total'];
        vehicleNumbers.forEach(v => {
          const sum = dateKeys.reduce((s, key) => s + Number(rowsByDate[key].values[v] || 0), 0);
          totals.push(Number(sum.toFixed(2)));
        });
        totals.forEach((val, i) => {
          const x = 50 + (i * columnWidth);
          doc.rect(x, y, columnWidth, 20).fillAndStroke('#e8f5e9', '#4caf50').fillColor('black')
             .text(String(val), x + 5, y + 5, { width: columnWidth - 10, height: 20, ellipsis: true });
        });
        y += 20;
        
        // End after totals
        doc.end();
        return;
      }

      // Default tabular output
      const pageWidth = doc.page.width - 100; // Account for margins
      const columnWidth = Math.min(pageWidth / config.fields.length, 120);
      let yPosition = doc.y;
      doc.fontSize(10).fillColor('black');
      config.fields.forEach((field, index) => {
        const xPosition = 50 + (index * columnWidth);
        doc.rect(xPosition, yPosition, columnWidth, 20)
           .fillAndStroke('#f0f0f0', '#000000')
           .fillColor('black')
           .text(field.label, xPosition + 5, yPosition + 5, {
             width: columnWidth - 10,
             height: 20,
             ellipsis: true
           });
      });
      yPosition += 20;
      data.forEach((item, rowIndex) => {
        if (yPosition > doc.page.height - 100) { doc.addPage(); yPosition = 50; }
        const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';
        config.fields.forEach((field, colIndex) => {
          const xPosition = 50 + (colIndex * columnWidth);
          const value = getNestedValue(item, field.key);
          const formattedValue = formatValue(value, field.type);
          doc.rect(xPosition, yPosition, columnWidth, 20)
             .fillAndStroke(fillColor, '#cccccc')
             .fillColor('black')
             .text(formattedValue || '', xPosition + 5, yPosition + 5, {
               width: columnWidth - 10,
               height: 20,
               ellipsis: true
             });
        });
        yPosition += 20;
      });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}