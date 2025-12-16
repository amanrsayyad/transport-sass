import mongoose, { Schema, Document } from 'mongoose';

export interface IStandby extends Document {
  vehicleId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  dates: Date[];
  attendanceStatus: 'Present' | 'Absent';
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StandbySchema = new Schema<IStandby>({
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverName: { type: String, required: true },
  dates: [{ type: Date, required: true }],
  attendanceStatus: {
    type: String,
    enum: ['Present', 'Absent'],
    required: true
  },
  remarks: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Index for vehicleId and latest updates
StandbySchema.index({ vehicleId: 1, updatedAt: -1 });

// In dev, ensure schema updates are applied
if ((mongoose.models as any).Standby) {
  try {
    (mongoose as any).deleteModel('Standby');
  } catch {
    delete (mongoose.models as any).Standby;
  }
}

export default mongoose.model<IStandby>('Standby', StandbySchema);