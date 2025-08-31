import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Maintenance {
  _id: string;
  appUserId: {
    _id: string;
    name: string;
  };
  bankId: {
    _id: string;
    bankName: string;
  };
  bankName: string;
  vehicleId: {
    _id: string;
    vehicleNumber: string;
  };
  vehicleNumber: string;
  category: string;
  categoryAmount: number;
  startKm: number;
  targetKm: number;
  endKm: number;
  totalKm: number;
  status: 'Pending' | 'Due' | 'Completed' | 'Overdue';
  isNotificationSent: boolean;
  isCompleted: boolean;
  notificationStatus?: 'Accepted' | 'Declined';
  declinedAt?: string;
  completedAt?: string;
  expenseId?: string;
  transactionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceState {
  maintenanceRecords: Maintenance[];
  notifications: Maintenance[];
  loading: boolean;
  error: string | null;
}

const initialState: MaintenanceState = {
  maintenanceRecords: [],
  notifications: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchMaintenanceRecords = createAsyncThunk(
  'maintenance/fetchMaintenanceRecords',
  async (params?: { appUserId?: string; vehicleId?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.appUserId) queryParams.append('appUserId', params.appUserId);
    if (params?.vehicleId) queryParams.append('vehicleId', params.vehicleId);
    if (params?.status) queryParams.append('status', params.status);
    
    const response = await fetch(`/api/maintenance?${queryParams}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch maintenance records');
    }
    return response.json();
  }
);

export const createMaintenanceRecord = createAsyncThunk(
  'maintenance/createMaintenanceRecord',
  async (maintenanceData: Omit<Maintenance, '_id' | 'createdAt' | 'updatedAt' | 'totalKm' | 'endKm' | 'status' | 'isNotificationSent' | 'isCompleted'>) => {
    const response = await fetch('/api/maintenance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(maintenanceData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create maintenance record');
    }
    return response.json();
  }
);

export const updateMaintenanceKm = createAsyncThunk(
  'maintenance/updateMaintenanceKm',
  async (vehicleId: string) => {
    const response = await fetch('/api/maintenance', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicleId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update maintenance km');
    }
    return response.json();
  }
);

export const fetchMaintenanceNotifications = createAsyncThunk(
  'maintenance/fetchMaintenanceNotifications',
  async (appUserId?: string) => {
    const queryParams = new URLSearchParams();
    if (appUserId) queryParams.append('appUserId', appUserId);
    
    const response = await fetch(`/api/maintenance/notifications?${queryParams}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch maintenance notifications');
    }
    return response.json();
  }
);

export const acceptMaintenanceNotification = createAsyncThunk(
  'maintenance/acceptMaintenanceNotification',
  async (maintenanceId: string) => {
    const response = await fetch(`/api/maintenance/${maintenanceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'accept' }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to accept maintenance notification');
    }
    return response.json();
  }
);

export const declineMaintenanceNotification = createAsyncThunk(
  'maintenance/declineMaintenanceNotification',
  async (maintenanceId: string) => {
    const response = await fetch(`/api/maintenance/${maintenanceId}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to decline maintenance notification');
    }
    return response.json();
  }
);

export const deleteMaintenanceRecord = createAsyncThunk(
  'maintenance/deleteMaintenanceRecord',
  async (id: string) => {
    const response = await fetch(`/api/maintenance/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete maintenance record');
    }
    return { id };
  }
);

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch maintenance records
      .addCase(fetchMaintenanceRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMaintenanceRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.maintenanceRecords = action.payload;
      })
      .addCase(fetchMaintenanceRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch maintenance records';
      })
      
      // Create maintenance record
      .addCase(createMaintenanceRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMaintenanceRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.maintenanceRecords.unshift(action.payload);
      })
      .addCase(createMaintenanceRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create maintenance record';
      })
      
      // Update maintenance km
      .addCase(updateMaintenanceKm.fulfilled, (state, action) => {
        // Update the records with new km data
        action.payload.forEach((updatedRecord: Maintenance) => {
          const index = state.maintenanceRecords.findIndex(record => record._id === updatedRecord._id);
          if (index !== -1) {
            state.maintenanceRecords[index] = updatedRecord;
          }
        });
      })
      
      // Fetch notifications
      .addCase(fetchMaintenanceNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
      })
      
      // Accept notification
      .addCase(acceptMaintenanceNotification.fulfilled, (state, action) => {
        const { maintenance } = action.payload;
        // Update the maintenance record
        const index = state.maintenanceRecords.findIndex(record => record._id === maintenance._id);
        if (index !== -1) {
          state.maintenanceRecords[index] = maintenance;
        }
        // Remove from notifications
        state.notifications = state.notifications.filter(notification => notification._id !== maintenance._id);
      })
      
      // Decline notification
      .addCase(declineMaintenanceNotification.fulfilled, (state, action) => {
        const { maintenance } = action.payload.data;
        // Update the maintenance record
        const index = state.maintenanceRecords.findIndex(record => record._id === maintenance._id);
        if (index !== -1) {
          state.maintenanceRecords[index] = maintenance;
        }
        // Update the notification in the notifications array (don't remove it)
        const notificationIndex = state.notifications.findIndex(notification => notification._id === maintenance._id);
        if (notificationIndex !== -1) {
          state.notifications[notificationIndex] = maintenance;
        }
      })
      
      // Delete maintenance record
      .addCase(deleteMaintenanceRecord.fulfilled, (state, action) => {
        state.maintenanceRecords = state.maintenanceRecords.filter(
          record => record._id !== action.payload.id
        );
        state.notifications = state.notifications.filter(
          notification => notification._id !== action.payload.id
        );
      });
  },
});

export const { clearError, clearNotifications } = maintenanceSlice.actions;
export default maintenanceSlice.reducer;