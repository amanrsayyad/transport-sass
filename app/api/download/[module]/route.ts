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
    populate: ['driverId', 'vehicleId', 'routeWiseExpenseBreakdown.customerId'],
    fields: [
      { key: 'tripId', label: 'Trip ID', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'driverName', label: 'Driver', type: 'text' },
      { key: 'vehicleNumber', label: 'Vehicle', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'startKm', label: 'Start KM', type: 'number' },
      { key: 'endKm', label: 'End KM', type: 'number' },
      { key: 'totalKm', label: 'Total KM', type: 'number' },
      { key: 'tripRouteCost', label: 'Route Cost', type: 'currency' },
      { key: 'tripExpenses', label: 'Trip Expenses', type: 'currency' },
      { key: 'tripDiselCost', label: 'Diesel Cost', type: 'currency' },
      { key: 'remainingAmount', label: 'Remaining Amount', type: 'currency' },
      { key: 'remarks', label: 'Remarks', type: 'text' }
    ],
    sheetName: 'Trips Data'
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
    
    // Fetch all data for the module
    let query = config.model.find();
    
    if (config.populate) {
      config.populate.forEach(field => {
        query = query.populate(field);
      });
    }
    
    const data = await query.sort({ createdAt: -1 });
    
    if (format === 'excel') {
      const excelBuffer = await generateModuleExcelReport(data, config, module);
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${module}-data-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else {
      // PDF format
      const pdfBuffer = await generateModulePDFReport(data, config, module);
      return new NextResponse(pdfBuffer, {
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
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(config.sheetName);
  
  // Add headers
  const headers = config.fields.map(field => field.label);
  worksheet.addRow(headers);
  
  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add data rows
  data.forEach(item => {
    const row = config.fields.map(field => {
      const value = getNestedValue(item, field.key);
      return formatValue(value, field.type);
    });
    worksheet.addRow(row);
  });
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  // Add summary
  worksheet.addRow([]);
  worksheet.addRow([`Total ${moduleName} records: ${data.length}`]);
  worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}

async function generateModulePDFReport(
  data: any[],
  config: ModuleConfig,
  moduleName: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      // Add title
      doc.fontSize(20).text(config.sheetName, { align: 'center' });
      doc.moveDown();
      
      // Add metadata
      doc.fontSize(12)
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'left' })
         .text(`Total records: ${data.length}`, { align: 'left' });
      doc.moveDown();
      
      if (data.length === 0) {
        doc.text('No data available', { align: 'center' });
        doc.end();
        return;
      }
      
      // Calculate column widths
      const pageWidth = doc.page.width - 100; // Account for margins
      const columnWidth = Math.min(pageWidth / config.fields.length, 120);
      
      // Add table headers
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
      
      // Add data rows
      data.forEach((item, rowIndex) => {
        // Check if we need a new page
        if (yPosition > doc.page.height - 100) {
          doc.addPage();
          yPosition = 50;
        }
        
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