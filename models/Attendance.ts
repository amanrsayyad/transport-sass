import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  date: Date;
  status: 'Present' | 'Absent' | 'On Trip';
  tripId?: mongoose.Types.ObjectId;
  tripNumber?: string;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverName: { type: String, required: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'On Trip'], 
    required: true 
  },
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip' },
  tripNumber: { type: String },
  remarks: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Create compound index for unique driver-date combination
AttendanceSchema.index({ driverId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);