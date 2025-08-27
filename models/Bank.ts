import mongoose from 'mongoose';

const BankSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  appUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Bank || mongoose.model('Bank', BankSchema);