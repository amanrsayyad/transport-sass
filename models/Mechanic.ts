import mongoose from "mongoose";

const mechanicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    certifications: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Mechanic ||
  mongoose.model("Mechanic", mechanicSchema);