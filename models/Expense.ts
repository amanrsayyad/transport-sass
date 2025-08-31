import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  date: {
    type: Date,
    required: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);