import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Type for populated object references
type PopulatedField<T> = T | { _id: T; [key: string]: any };

export interface Trip {
  _id: string;
  tripId: string;
  date: Date[];
  startKm: number;
  endKm: number;
  totalKm: number;
  driverId: PopulatedField<string>;
  driverName: string;
  vehicleId: PopulatedField<string>;
  vehicleNumber: string;
  status: 'Draft' | 'In Progress' | 'Completed' | 'Cancelled';
  remarks?: string;
  routeWiseExpenseBreakdown: RouteWiseExpenseBreakdown[];
  tripRouteCost: number;
  tripExpenses: number;
  tripDiselCost: number;
  tripFuelQuantity: number;
  fuelNeededForTrip: number;
  totalTripKm: number;
  remainingAmount: number;
  createdBy: PopulatedField<string>;
  createdAt: string;
  updatedAt: string;
}

export interface RouteWiseExpenseBreakdown {
  routeNumber: number;
  startLocation: string;
  endLocation: string;
  productName: string;
  weight: number;
  rate: number;
  routeAmount: number;
  userId: PopulatedField<string>;
  userName: string;
  customerId: PopulatedField<string>;
  customerName: string;
  bankName: string;
  bankId: PopulatedField<string>;
  paymentType: string;
  expenses: Expense[];
  totalExpense: number;
}

export interface Expense {
  category: string;
  amount: number;
  quantity: number;
  total: number;
  description?: string;
}

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status: string;
    driverId: string;
    vehicleId: string;
  };
}

const initialState: TripState = {
  trips: [],
  currentTrip: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  filters: {
    status: 'all',
    driverId: '',
    vehicleId: ''
  }
};

// Async thunks
export const fetchTrips = createAsyncThunk(
  'trips/fetchTrips',
  async (params: { page?: number; limit?: number; status?: string; driverId?: string; vehicleId?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.driverId) queryParams.append('driverId', params.driverId);
    if (params.vehicleId) queryParams.append('vehicleId', params.vehicleId);

    const response = await fetch(`/api/trips?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch trips');
    }
    return response.json();
  }
);

export const fetchTripById = createAsyncThunk(
  'trips/fetchTripById',
  async (id: string) => {
    const response = await fetch(`/api/trips/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch trip');
    }
    return response.json();
  }
);

export const createTrip = createAsyncThunk(
  'trips/createTrip',
  async (tripData: Partial<Trip>) => {
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create trip');
    }
    return response.json();
  }
);

export const updateTrip = createAsyncThunk(
  'trips/updateTrip',
  async ({ id, tripData }: { id: string; tripData: Partial<Trip> }) => {
    const response = await fetch(`/api/trips/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update trip');
    }
    return response.json();
  }
);

export const deleteTrip = createAsyncThunk(
  'trips/deleteTrip',
  async (id: string) => {
    const response = await fetch(`/api/trips/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete trip');
    }
    return { id };
  }
);

const tripSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<TripState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentTrip: (state) => {
      state.currentTrip = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch trips
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload.trips;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch trips';
      })
      
      // Fetch trip by ID
      .addCase(fetchTripById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTripById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTrip = action.payload;
      })
      .addCase(fetchTripById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch trip';
      })
      
      // Create trip
      .addCase(createTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.trips.unshift(action.payload);
      })
      .addCase(createTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create trip';
      })
      
      // Update trip
      .addCase(updateTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTrip.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.trips.findIndex(trip => trip._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
        if (state.currentTrip?._id === action.payload._id) {
          state.currentTrip = action.payload;
        }
      })
      .addCase(updateTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update trip';
      })
      
      // Delete trip
      .addCase(deleteTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = state.trips.filter(trip => trip._id !== action.payload.id);
        if (state.currentTrip?._id === action.payload.id) {
          state.currentTrip = null;
        }
      })
      .addCase(deleteTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete trip';
      });
  }
});

export const { setFilters, clearCurrentTrip, clearError } = tripSlice.actions;
export default tripSlice.reducer;