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
  
  // Calculate overall total
  this.total = this.rows.reduce((sum, row) => sum + (row.total || 0), 0);
  next();
});

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);