import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ["truck", "van", "bus", "car", "motorcycle"],
    },
    vehicleWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    vehicleStatus: {
      type: String,
      enum: ["available", "in-use", "maintenance", "retired"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Vehicle ||
  mongoose.model("Vehicle", vehicleSchema);
