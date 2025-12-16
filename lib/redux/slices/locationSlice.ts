import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Location {
  _id: string;
  locationName: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LocationState {
  locations: Location[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  locations: [],
  isLoading: false,
  error: null,
};

export const fetchLocations = createAsyncThunk("locations/fetchLocations", async () => {
  const response = await fetch("/api/locations");
  if (!response.ok) throw new Error("Failed to fetch locations");
  return (await response.json()) as Location[];
});

export const createLocation = createAsyncThunk(
  "locations/createLocation",
  async (locationName: string) => {
    const response = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationName }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to create location");
    }
    return (await response.json()) as Location;
  }
);

const locationSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.isLoading = false;
        // De-duplicate by name and sort
        const map = new Map<string, Location>();
        for (const l of action.payload || []) {
          map.set(l.locationName, l);
        }
        state.locations = Array.from(map.values()).sort((a, b) => a.locationName.localeCompare(b.locationName));
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch locations";
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        const created = action.payload;
        const idx = state.locations.findIndex((l) => l.locationName === created.locationName);
        if (idx >= 0) {
          state.locations[idx] = created;
        } else {
          state.locations.unshift(created);
        }
        state.locations = state.locations
          .reduce((acc: Location[], cur) => (acc.find((l) => l.locationName === cur.locationName) ? acc : acc.concat(cur)), [])
          .sort((a, b) => a.locationName.localeCompare(b.locationName));
      });
  },
});

export default locationSlice.reducer;