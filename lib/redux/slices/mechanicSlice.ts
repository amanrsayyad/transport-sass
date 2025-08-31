import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Mechanic {
  _id: string;
  name: string;
  phone: string;
  status: "active" | "inactive";
  certifications: string[];
  createdAt: string;
  updatedAt: string;
}

interface MechanicState {
  mechanics: Mechanic[];
  currentMechanic: Mechanic | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MechanicState = {
  mechanics: [],
  currentMechanic: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchMechanics = createAsyncThunk(
  "mechanics/fetchMechanics",
  async () => {
    const response = await fetch("/api/mechanics");
    if (!response.ok) throw new Error("Failed to fetch mechanics");
    return response.json();
  }
);

export const createMechanic = createAsyncThunk(
  "mechanics/createMechanic",
  async (mechanicData: Partial<Mechanic>) => {
    const response = await fetch("/api/mechanics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mechanicData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create mechanic");
    }
    return response.json();
  }
);

export const updateMechanic = createAsyncThunk(
  "mechanics/updateMechanic",
  async ({ id, data }: { id: string; data: Partial<Mechanic> }) => {
    const response = await fetch(`/api/mechanics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update mechanic");
    }
    return response.json();
  }
);

export const deleteMechanic = createAsyncThunk(
  "mechanics/deleteMechanic",
  async (id: string) => {
    const response = await fetch(`/api/mechanics/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete mechanic");
    return id;
  }
);

const mechanicSlice = createSlice({
  name: "mechanics",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentMechanic: (state, action: PayloadAction<Mechanic | null>) => {
      state.currentMechanic = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch mechanics
      .addCase(fetchMechanics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMechanics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mechanics = action.payload;
      })
      .addCase(fetchMechanics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch mechanics";
      })
      // Create mechanic
      .addCase(createMechanic.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMechanic.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mechanics.unshift(action.payload);
      })
      .addCase(createMechanic.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create mechanic";
      })
      // Update mechanic
      .addCase(updateMechanic.fulfilled, (state, action) => {
        const index = state.mechanics.findIndex(
          (mechanic) => mechanic._id === action.payload._id
        );
        if (index !== -1) {
          state.mechanics[index] = action.payload;
        }
      })
      // Delete mechanic
      .addCase(deleteMechanic.fulfilled, (state, action) => {
        state.mechanics = state.mechanics.filter(
          (mechanic) => mechanic._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentMechanic } = mechanicSlice.actions;
export default mechanicSlice.reducer;