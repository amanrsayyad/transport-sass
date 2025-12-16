import mongoose from "mongoose";

const appUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      default: undefined,
    },
    address: {
      type: String,
      trim: true,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);
// Ensure schema changes are applied during dev hot-reload by deleting cached model
if (mongoose.models.AppUser) {
  // Available in Mongoose v8
  // @ts-ignore - deleteModel exists at runtime
  if (typeof (mongoose as any).deleteModel === "function") {
    (mongoose as any).deleteModel("AppUser");
  } else {
    delete (mongoose as any).models.AppUser;
  }
}

appUserSchema.index({ mobileNo: 1 });

const AppUserModel = mongoose.model("AppUser", appUserSchema);

try { AppUserModel.collection.dropIndex("mobileNo_1").catch(() => {}); } catch {}

export default AppUserModel;
