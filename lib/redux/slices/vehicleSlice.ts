import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  vehicleNumber: string;
  vehicleType: "truck" | "van" | "bus" | "car" | "motorcycle";
  vehicleWeight: number;
  vehicleStatus: "available" | "in-use" | "maintenance" | "retired";
  make: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface VehicleState {
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: VehicleState = {
  vehicles: [],
  currentVehicle: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchVehicles = createAsyncThunk(
  "vehicles/fetchVehicles",
  async () => {
    const response = await fetch("/api/vehicles");
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
  }
);

export const createVehicle = createAsyncThunk(
  "vehicles/createVehicle",
  async (vehicleData: Partial<Vehicle>) => {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicleData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create vehicle");
    }
    return response.json();
  }
);

export const updateVehicle = createAsyncThunk(
  "vehicles/updateVehicle",
  async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update vehicle");
    return response.json();
  }
);

export const deleteVehicle = createAsyncThunk(
  "vehicles/deleteVehicle",
  async (id: string) => {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete vehicle");
    return id;
  }
);

const vehicleSlice = createSlice({
  name: "vehicles",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentVehicle: (state, action: PayloadAction<Vehicle | null>) => {
      state.currentVehicle = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch vehicles
      .addCase(fetchVehicles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch vehicles";
      })
      // Create vehicle
      .addCase(createVehicle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles.unshift(action.payload);
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create vehicle";
      })
      // Update vehicle
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const index = state.vehicles.findIndex(
          (vehicle) => vehicle._id === action.payload._id
        );
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
      })
      // Delete vehicle
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter(
          (vehicle) => vehicle._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentVehicle } = vehicleSlice.actions;
export default vehicleSlice.reducer;
