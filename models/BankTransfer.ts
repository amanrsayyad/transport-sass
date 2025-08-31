import mongoose from 'mongoose';

const BankTransferSchema = new mongoose.Schema({
  fromBankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: true,
  },
  toBankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  transferDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED',
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
}, {
  timestamps: true,
});

export default mongoose.models.BankTransfer || mongoose.model('BankTransfer', BankTransferSchema);