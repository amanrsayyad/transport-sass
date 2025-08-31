import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Driver {
  _id: string;
  name: string;
  mobileNo: string;
  status: "active" | "inactive" | "on-leave";
  createdAt: string;
  updatedAt: string;
}

interface DriverState {
  drivers: Driver[];
  currentDriver: Driver | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DriverState = {
  drivers: [],
  currentDriver: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchDrivers = createAsyncThunk(
  "drivers/fetchDrivers",
  async () => {
    const response = await fetch("/api/drivers");
    if (!response.ok) throw new Error("Failed to fetch drivers");
    return response.json();
  }
);

export const createDriver = createAsyncThunk(
  "drivers/createDriver",
  async (driverData: Partial<Driver>) => {
    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driverData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create driver");
    }
    return response.json();
  }
);

export const updateDriver = createAsyncThunk(
  "drivers/updateDriver",
  async ({ id, data }: { id: string; data: Partial<Driver> }) => {
    const response = await fetch(`/api/drivers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update driver");
    return response.json();
  }
);

export const deleteDriver = createAsyncThunk(
  "drivers/deleteDriver",
  async (id: string) => {
    const response = await fetch(`/api/drivers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete driver");
    return id;
  }
);

const driverSlice = createSlice({
  name: "drivers",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentDriver: (state, action: PayloadAction<Driver | null>) => {
      state.currentDriver = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch drivers
      .addCase(fetchDrivers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.drivers = action.payload;
      })
      .addCase(fetchDrivers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch drivers";
      })
      // Create driver
      .addCase(createDriver.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDriver.fulfilled, (state, action) => {
        state.isLoading = false;
        state.drivers.unshift(action.payload);
      })
      .addCase(createDriver.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create driver";
      })
      // Update driver
      .addCase(updateDriver.fulfilled, (state, action) => {
        const index = state.drivers.findIndex(
          (driver) => driver._id === action.payload._id
        );
        if (index !== -1) {
          state.drivers[index] = action.payload;
        }
      })
      // Delete driver
      .addCase(deleteDriver.fulfilled, (state, action) => {
        state.drivers = state.drivers.filter(
          (driver) => driver._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentDriver } = driverSlice.actions;
export default driverSlice.reducer;
