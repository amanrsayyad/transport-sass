import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface DriverBudget {
  _id: string;
  appUserId: {
    _id: string;
    name: string;
    email: string;
  };
  bankId: {
    _id: string;
    bankName: string;
    accountNumber: string;
  };
  driverId: {
    _id: string;
    name: string;
    email: string;
  };
  dailyBudgetAmount: number;
  date: string;
  description: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for creating driver budget (API expects string IDs)
export interface DriverBudgetCreateData {
  appUserId: string;
  bankId: string;
  driverId: string;
  dailyBudgetAmount: number;
  date: string;
  description: string;
}

export interface FuelTrackingCreateData {
  appUserId: string;
  bankId: string;
  vehicleId: string;
  startKm: number;
  endKm: number;
  fuelQuantity: number;
  addFuelQuantity: number;
  fuelRate: number;
  totalAmount: number;
  truckAverage: number;
  date: string;
  description?: string;
  paymentType: string;
}

export interface FuelTracking {
  _id: string;
  appUserId: {
    _id: string;
    name: string;
    email: string;
  };
  bankId: {
    _id: string;
    bankName: string;
    accountNumber: string;
  };
  vehicleId: {
    _id: string;
    vehicleNumber: string;
    vehicleType: string;
    make: string;
    model: string;
    registrationNumber: string;
  };
  startKm: number;
  endKm: number;
  fuelQuantity: number;
  addFuelQuantity?: number;
  fuelRate: number;
  totalAmount: number;
  truckAverage: number;
  date: string;
  description: string;
  paymentType: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface OperationsState {
  driverBudgets: DriverBudget[];
  fuelTrackings: FuelTracking[];
  currentDriverBudget: DriverBudget | null;
  currentFuelTracking: FuelTracking | null;
  loading: boolean;
  error: string | null;
  driverBudgetsPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fuelTrackingsPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: OperationsState = {
  driverBudgets: [],
  fuelTrackings: [],
  currentDriverBudget: null,
  currentFuelTracking: null,
  loading: false,
  error: null,
  driverBudgetsPagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  fuelTrackingsPagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
};

// Async thunks for Driver Budget
export const fetchDriverBudgets = createAsyncThunk(
  'operations/fetchDriverBudgets',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/driver-budgets?${queryParams}`);
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to fetch driver budgets');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createDriverBudget = createAsyncThunk(
  'operations/createDriverBudget',
  async (budgetData: DriverBudgetCreateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/driver-budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create driver budget');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

// Async thunks for Fuel Tracking
export const fetchFuelTrackings = createAsyncThunk(
  'operations/fetchFuelTrackings',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/fuel-tracking?${queryParams}`);
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to fetch fuel trackings');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createFuelTracking = createAsyncThunk(
  'operations/createFuelTracking',
  async (fuelData: FuelTrackingCreateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/fuel-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fuelData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create fuel tracking');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const updateFuelTracking = createAsyncThunk(
  'operations/updateFuelTracking',
  async ({ id, fuelData }: { id: string; fuelData: Partial<FuelTrackingCreateData> }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/fuel-tracking/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fuelData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to update fuel tracking');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const deleteFuelTracking = createAsyncThunk(
  'operations/deleteFuelTracking',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/fuel-tracking/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to delete fuel tracking');
      }
      
      return id;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

// Slice
const operationsSlice = createSlice({
  name: 'operations',
  initialState,
  reducers: {
    setCurrentDriverBudget: (state, action) => {
      state.currentDriverBudget = action.payload;
    },
    setCurrentFuelTracking: (state, action) => {
      state.currentFuelTracking = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch driver budgets
      .addCase(fetchDriverBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDriverBudgets.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload.data) {
        state.driverBudgets = action.payload.data;
        state.driverBudgetsPagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          total: action.payload.total || 0,
          pages: action.payload.pages || 0
        };
      } else {
        state.driverBudgets = action.payload;
      }
    })
      .addCase(fetchDriverBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create driver budget
      .addCase(createDriverBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDriverBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.driverBudgets.unshift(action.payload);
      })
      .addCase(createDriverBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch fuel trackings
      .addCase(fetchFuelTrackings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFuelTrackings.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload.data) {
        state.fuelTrackings = action.payload.data;
        state.fuelTrackingsPagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          total: action.payload.total || 0,
          pages: action.payload.pages || 0
        };
      } else {
        state.fuelTrackings = action.payload;
      }
    })
      .addCase(fetchFuelTrackings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create fuel tracking
      .addCase(createFuelTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFuelTracking.fulfilled, (state, action) => {
        state.loading = false;
        state.fuelTrackings.unshift(action.payload);
      })
      .addCase(createFuelTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update fuel tracking
      .addCase(updateFuelTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFuelTracking.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.fuelTrackings.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.fuelTrackings[index] = action.payload;
        }
      })
      .addCase(updateFuelTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete fuel tracking
      .addCase(deleteFuelTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFuelTracking.fulfilled, (state, action) => {
        state.loading = false;
        state.fuelTrackings = state.fuelTrackings.filter(item => item._id !== action.payload);
      })
      .addCase(deleteFuelTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setCurrentDriverBudget, 
  setCurrentFuelTracking, 
  clearError 
} = operationsSlice.actions;
export default operationsSlice.reducer;