import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface AppUser {
  _id: string;
  name: string;
  mobileNo: string;
  gstin?: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface AppUserState {
  appUsers: AppUser[];
  currentAppUser: AppUser | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppUserState = {
  appUsers: [],
  currentAppUser: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchAppUsers = createAsyncThunk(
  "appUsers/fetchAppUsers",
  async () => {
    const response = await fetch("/api/app-users");
    if (!response.ok) throw new Error("Failed to fetch app users");
    return response.json();
  }
);

export const createAppUser = createAsyncThunk(
  "appUsers/createAppUser",
  async (appUserData: Partial<AppUser>) => {
    const response = await fetch("/api/app-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appUserData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create app user");
    }
    return response.json();
  }
);

export const updateAppUser = createAsyncThunk(
  "appUsers/updateAppUser",
  async ({ id, data }: { id: string; data: Partial<AppUser> }) => {
    const response = await fetch(`/api/app-users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update app user");
    return response.json();
  }
);

export const deleteAppUser = createAsyncThunk(
  "appUsers/deleteAppUser",
  async (id: string) => {
    const response = await fetch(`/api/app-users/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete app user");
    return id;
  }
);

const appUserSlice = createSlice({
  name: "appUsers",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentAppUser: (state, action: PayloadAction<AppUser | null>) => {
      state.currentAppUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch app users
      .addCase(fetchAppUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAppUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appUsers = action.payload;
      })
      .addCase(fetchAppUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch app users";
      })
      // Create app user
      .addCase(createAppUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAppUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appUsers.unshift(action.payload);
      })
      .addCase(createAppUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create app user";
      })
      // Update app user
      .addCase(updateAppUser.fulfilled, (state, action) => {
        const index = state.appUsers.findIndex(
          (user) => user._id === action.payload._id
        );
        if (index !== -1) {
          state.appUsers[index] = action.payload;
        }
      })
      // Delete app user
      .addCase(deleteAppUser.fulfilled, (state, action) => {
        state.appUsers = state.appUsers.filter(
          (user) => user._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentAppUser } = appUserSlice.actions;
export default appUserSlice.reducer;
