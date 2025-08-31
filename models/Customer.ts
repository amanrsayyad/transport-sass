import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryRate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productRate: {
      type: Number,
      required: true,
      min: 0,
    },
    categories: [categorySchema],
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: true,
      trim: true,
    },
    products: [productSchema],
  },
  {
    timestamps: true,
  }
);

// Create indexes
customerSchema.index({ customerName: 1 });
customerSchema.index({ companyName: 1 });
customerSchema.index({ mobileNo: 1 });

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default Customer;
