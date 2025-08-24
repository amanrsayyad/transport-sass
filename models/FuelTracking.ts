import mongoose from 'mongoose';

const FuelTrackingSchema = new mongoose.Schema({
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
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
  },
  startKm: {
    type: Number,
    required: true,
  },
  endKm: {
    type: Number,
    required: true,
  },
  fuelQuantity: {
    type: Number,
    required: true,
  },
  remainingFuelQuantity: {
    type: Number,
    default: 0,
  },
  fuelRate: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  truckAverage: {
    type: Number,
    required: true,
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

export default mongoose.models.FuelTracking || mongoose.model('FuelTracking', FuelTrackingSchema);