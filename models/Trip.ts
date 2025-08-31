import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense {
  category: string;
  amount: number;
  quantity: number;
  total: number;
  description?: string;
}

export interface IRouteWiseExpenseBreakdown {
  routeNumber: number;
  startLocation: string;
  endLocation: string;
  productName: string;
  weight: number;
  rate: number;
  routeAmount: number;
  userId: mongoose.Types.ObjectId;
  userName: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  bankName: string;
  bankId: mongoose.Types.ObjectId;
  paymentType: string;
  expenses: IExpense[];
  totalExpense: number;
}

export interface ITrip extends Document {
  tripId: string;
  date: Date[];
  startKm: number;
  endKm: number;
  totalKm: number;
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  vehicleId: mongoose.Types.ObjectId;
  vehicleNumber: string;
  status: 'Draft' | 'In Progress' | 'Completed' | 'Cancelled';
  remarks?: string;
  routeWiseExpenseBreakdown: IRouteWiseExpenseBreakdown[];
  tripRouteCost: number;
  tripExpenses: number;
  tripDiselCost: number;
  fuelNeededForTrip: number;
  totalTripKm: number;
  remainingAmount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true },
  description: { type: String }
});

const RouteWiseExpenseBreakdownSchema = new Schema<IRouteWiseExpenseBreakdown>({
  routeNumber: { type: Number, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  productName: { type: String, required: true },
  weight: { type: Number, required: true },
  rate: { type: Number, required: true },
  routeAmount: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true },
  userName: { type: String, required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  bankName: { type: String, required: true },
  bankId: { type: Schema.Types.ObjectId, ref: 'Bank', required: true },
  paymentType: { 
    type: String, 
    required: true,
    enum: ['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card', 'Cheque']
  },
  expenses: [ExpenseSchema],
  totalExpense: { type: Number, required: true }
});

const TripSchema = new Schema<ITrip>({
  tripId: { type: String, required: true, unique: true },
  date: [{ type: Date, required: true }],
  startKm: { type: Number, required: true },
  endKm: { type: Number, required: true },
  totalKm: { type: Number, required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverName: { type: String, required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  vehicleNumber: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Draft', 'In Progress', 'Completed', 'Cancelled'], 
    default: 'Draft' 
  },
  remarks: { type: String },
  routeWiseExpenseBreakdown: [RouteWiseExpenseBreakdownSchema],
  tripRouteCost: { type: Number, required: true },
  tripExpenses: { type: Number, required: true },
  tripDiselCost: { type: Number, required: true },
  fuelNeededForTrip: { type: Number, required: true },
  totalTripKm: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true }
}, {
  timestamps: true
});

// Pre-save middleware to calculate fields
TripSchema.pre('save', function(next) {
  // Calculate totalKm
  this.totalKm = this.endKm - this.startKm;
  
  // Calculate tripRouteCost (sum of all route amounts)
  this.tripRouteCost = this.routeWiseExpenseBreakdown.reduce((sum, route) => sum + route.routeAmount, 0);
  
  // Calculate tripExpenses (sum of all expenses)
  this.tripExpenses = this.routeWiseExpenseBreakdown.reduce((sum, route) => sum + route.totalExpense, 0);
  
  // Calculate remainingAmount
  this.remainingAmount = this.tripRouteCost - this.tripExpenses - this.tripDiselCost;
  
  next();
});

export default mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);