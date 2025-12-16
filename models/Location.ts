import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

locationSchema.index({ locationName: 1 }, { unique: true });

const Location =
  mongoose.models.Location || mongoose.model("Location", locationSchema);

export default Location;