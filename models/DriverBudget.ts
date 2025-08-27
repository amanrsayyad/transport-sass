import mongoose from 'mongoose';

const DriverBudgetSchema = new mongoose.Schema({
  appUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser',
    required: true,
  },
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  dailyBudgetAmount: {
    type: Number,
    required: true,
  },
  remainingBudgetAmount: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
  },
  paymentType: {
    type: String,
    required: true,
    enum: ['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card', 'Cheque'],
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
}, {
  timestamps: true,
});

export default mongoose.models.DriverBudget || mongoose.model('DriverBudget', DriverBudgetSchema);