import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceRow {
  product: string;
  truckNo: string;
  articles?: string;
  weight?: number;
  rate?: number;
  total?: number;
  remarks?: string;
}

export interface IInvoice extends Document {
  _id: string;
  date: Date;
  from: string;
  to: string;
  taluka?: string;
  dist?: string;
  customerName: string;
  consignor?: string;
  consignee?: string;
  lrNo: string;
  remarks?: string;
  total: number;
  taxPercent?: number;
  taxAmount?: number;
  advanceAmount?: number;
  remainingAmount?: number;
  appUserId?: mongoose.Types.ObjectId;
  status: 'Paid' | 'Unpaid' | 'Pending';
  rows: IInvoiceRow[];
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceRowSchema = new Schema<IInvoiceRow>({
  product: {
    type: String,
    required: [true, 'Product is required']
  },
  truckNo: {
    type: String,
    required: [true, 'Truck number is required']
  },
  articles: {
    type: String,
    default: ''
  },
  weight: {
    type: Number,
    default: 0
  },
  rate: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    default: ''
  }
});

const InvoiceSchema = new Schema<IInvoice>({
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  from: {
    type: String,
    required: [true, 'From location is required'],
    trim: true
  },
  to: {
    type: String,
    required: [true, 'To location is required'],
    trim: true
  },
  taluka: {
    type: String,
    trim: true,
    default: ''
  },
  dist: {
    type: String,
    trim: true,
    default: ''
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  consignor: {
    type: String,
    trim: true,
    default: ''
  },
  consignee: {
    type: String,
    trim: true,
    default: ''
  },
  lrNo: {
    type: String,
    required: [true, 'LR number is required'],
    unique: true,
    trim: true
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  taxPercent: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  advanceAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  appUserId: {
    type: Schema.Types.ObjectId,
    ref: 'AppUser'
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Pending'],
    default: 'Unpaid'
  },
  rows: {
    type: [InvoiceRowSchema],
    validate: {
      validator: function(rows: IInvoiceRow[]) {
        return rows && rows.length > 0;
      },
      message: 'At least one row is required'
    }
  }
}, {
  timestamps: true
});

// Generate LR number before saving
InvoiceSchema.pre('save', function(next) {
  if (!this.lrNo) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.lrNo = `LR${dateStr}${randomNum}`;
  }
  next();
});

// Calculate total before saving
InvoiceSchema.pre('save', function(next) {
  // Calculate total for each row
  this.rows.forEach(row => {
    if (row.weight && row.rate) {
      row.total = row.weight * row.rate;
    }
  });
  
  // Calculate base total
  const baseTotal = this.rows.reduce((sum, row) => sum + (row.total || 0), 0);
  // Compute tax values if taxPercent provided
  const taxPercent = Number((this as any).taxPercent || 0);
  const taxAmount = isFinite(taxPercent) && taxPercent > 0 ? (baseTotal * taxPercent) / 100 : 0;
  (this as any).taxAmount = taxAmount;
  // Set final total including tax
  this.total = baseTotal + taxAmount;
  
  // Derive remainingAmount if advanceAmount provided
  if (typeof (this as any).advanceAmount === 'number') {
    (this as any).remainingAmount = Math.max(0, this.total - (this as any).advanceAmount);
  } else if (typeof (this as any).remainingAmount !== 'number') {
    (this as any).remainingAmount = this.total;
  }
  next();
});

// In dev environments, Next.js can cache models; ensure schema updates apply
if ((mongoose.models as any).Invoice) {
  try {
    (mongoose as any).deleteModel('Invoice');
  } catch (err) {
    delete (mongoose.models as any).Invoice;
  }
}
export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);