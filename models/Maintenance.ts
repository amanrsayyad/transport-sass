import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenance extends Document {
  appUserId: mongoose.Types.ObjectId;
  bankId: mongoose.Types.ObjectId;
  bankName: string;
  vehicleId: mongoose.Types.ObjectId;
  vehicleNumber: string;
  category: string;
  categoryAmount: number;
  startKm: number;
  targetKm: number;
  endKm: number;
  totalKm: number;
  status: 'Pending' | 'Due' | 'Completed' | 'Overdue';
  isNotificationSent: boolean;
  isCompleted: boolean;
  isMonitoring?: boolean;
  monitoringStartedAt?: Date;
  monitoringStoppedAt?: Date;
  lastCheckedAt?: Date;
  completedAt?: Date;
  notificationStatus?: 'Accepted' | 'Declined';
  declinedAt?: Date;
  expenseId?: mongoose.Types.ObjectId;
  transactionId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceSchema = new Schema<IMaintenance>({
  appUserId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true },
  bankId: { type: Schema.Types.ObjectId, ref: 'Bank', required: true },
  bankName: { type: String, required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  vehicleNumber: { type: String, required: true },
  category: { type: String, required: true },
  categoryAmount: { type: Number, required: true },
  startKm: { type: Number, required: true },
  targetKm: { type: Number, required: true },
  endKm: { type: Number, default: 0 },
  totalKm: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Pending', 'Due', 'Completed', 'Overdue'], 
    default: 'Pending' 
  },
  isNotificationSent: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  isMonitoring: { type: Boolean, default: false },
  monitoringStartedAt: { type: Date },
  monitoringStoppedAt: { type: Date },
  lastCheckedAt: { type: Date },
  completedAt: { type: Date },
  notificationStatus: { type: String, enum: ['Accepted', 'Declined'] },
  declinedAt: { type: Date },
  expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Index for efficient queries
MaintenanceSchema.index({ vehicleId: 1, status: 1 });
MaintenanceSchema.index({ appUserId: 1 });
MaintenanceSchema.index({ status: 1, isNotificationSent: 1 });

export default mongoose.models.Maintenance || mongoose.model<IMaintenance>('Maintenance', MaintenanceSchema);