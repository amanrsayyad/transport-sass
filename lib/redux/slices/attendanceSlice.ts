import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Attendance {
  _id: string;
  driverId: string;
  driverName: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Trip';
  tripId?: string | { _id: string; tripId: string };
  tripNumber?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AttendanceState {
  attendanceRecords: Attendance[];
  loading: boolean;
  error: string | null;
  selectedMonth: number;
  selectedYear: number;
  selectedDriverId: string;
}

const initialState: AttendanceState = {
  attendanceRecords: [],
  loading: false,
  error: null,
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  selectedDriverId: ''
};

// Async thunks
export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAttendance',
  async (params: { 
    driverId?: string; 
    month?: number; 
    year?: number; 
    startDate?: string; 
    endDate?: string; 
  } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.driverId) queryParams.append('driverId', params.driverId);
    if (params.month) queryParams.append('month', params.month.toString());
    if (params.year) queryParams.append('year', params.year.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(`/api/attendance?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }
    return response.json();
  }
);

export const createAttendance = createAsyncThunk(
  'attendance/createAttendance',
  async (attendanceData: Partial<Attendance>) => {
    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attendanceData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create attendance');
    }
    return response.json();
  }
);

export const updateAttendance = createAsyncThunk(
  'attendance/updateAttendance',
  async ({ id, attendanceData }: { id: string; attendanceData: Partial<Attendance> }) => {
    const response = await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attendanceData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update attendance');
    }
    return response.json();
  }
);

export const bulkUpdateAttendance = createAsyncThunk(
  'attendance/bulkUpdateAttendance',
  async (attendanceRecords: Partial<Attendance>[]) => {
    const response = await fetch('/api/attendance', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendanceRecords }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update attendance');
    }
    return response.json();
  }
);

export const deleteAttendance = createAsyncThunk(
  'attendance/deleteAttendance',
  async (id: string) => {
    const response = await fetch(`/api/attendance/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete attendance');
    }
    return { id };
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setSelectedMonth: (state, action: PayloadAction<number>) => {
      state.selectedMonth = action.payload;
    },
    setSelectedYear: (state, action: PayloadAction<number>) => {
      state.selectedYear = action.payload;
    },
    setSelectedDriverId: (state, action: PayloadAction<string>) => {
      state.selectedDriverId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Local state update for optimistic UI updates
    updateAttendanceLocally: (state, action: PayloadAction<{ date: string; driverId: string; status: string; remarks?: string }>) => {
      const { date, driverId, status, remarks } = action.payload;
      const existingIndex = state.attendanceRecords.findIndex(
        record => record.date === date && record.driverId === driverId
      );
      
      if (existingIndex !== -1) {
        state.attendanceRecords[existingIndex].status = status as any;
        if (remarks !== undefined) {
          state.attendanceRecords[existingIndex].remarks = remarks;
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch attendance
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRecords = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch attendance';
      })
      
      // Create attendance
      .addCase(createAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRecords.push(action.payload);
      })
      .addCase(createAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create attendance';
      })
      
      // Update attendance
      .addCase(updateAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAttendance.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.attendanceRecords.findIndex(record => record._id === action.payload._id);
        if (index !== -1) {
          state.attendanceRecords[index] = action.payload;
        }
      })
      .addCase(updateAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update attendance';
      })
      
      // Bulk update attendance
      .addCase(bulkUpdateAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateAttendance.fulfilled, (state) => {
        state.loading = false;
        // Refresh attendance data after bulk update
      })
      .addCase(bulkUpdateAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update attendance';
      })
      
      // Delete attendance
      .addCase(deleteAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRecords = state.attendanceRecords.filter(record => record._id !== action.payload.id);
      })
      .addCase(deleteAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete attendance';
      });
  }
});

export const { 
  setSelectedMonth, 
  setSelectedYear, 
  setSelectedDriverId, 
  clearError,
  updateAttendanceLocally 
} = attendanceSlice.actions;

export default attendanceSlice.reducer;