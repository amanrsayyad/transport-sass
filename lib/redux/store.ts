import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import appUserSlice from "./slices/appUserSlice";
import vehicleSlice from "./slices/vehicleSlice";
import driverSlice from "./slices/driverSlice";
import customerSlice from "./slices/customerSlice";
import bankSlice from "./slices/bankSlice";
import transactionSlice from "./slices/transactionSlice";
import financeSlice from "./slices/financeSlice";
import operationsSlice from "./slices/operationsSlice";
import invoiceSlice from "./slices/invoiceSlice";
import tripSlice from "./slices/tripSlice";
import attendanceSlice from "./slices/attendanceSlice";
import maintenanceSlice from "./slices/maintenanceSlice";
import mechanicSlice from "./slices/mechanicSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    appUsers: appUserSlice,
    vehicles: vehicleSlice,
    drivers: driverSlice,
    customers: customerSlice,
    banks: bankSlice,
    transactions: transactionSlice,
    finance: financeSlice,
    operations: operationsSlice,
    invoices: invoiceSlice,
    trips: tripSlice,
    attendance: attendanceSlice,
    maintenance: maintenanceSlice,
    mechanics: mechanicSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
