import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface Bank {
  _id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  appUserId: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankCreateData {
  bankName: string;
  accountNumber: string;
  balance: number;
  appUserId: string;
}

export interface BankUpdateData {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  appUserId: string;
}

export interface BankTransfer {
  _id: string;
  fromBankId: {
    _id: string;
    bankName: string;
    accountNumber: string;
  };
  toBankId: {
    _id: string;
    bankName: string;
    accountNumber: string;
  };
  amount: number;
  description: string;
  transferDate: string;
  status: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Create data interface for form submissions
export interface BankTransferCreateData {
  fromBankId: string;
  toBankId: string;
  amount: number;
  description: string;
}

interface BankState {
  banks: Bank[];
  transfers: BankTransfer[];
  currentBank: Bank | null;
  loading: boolean;
  error: string | null;
}

const initialState: BankState = {
  banks: [],
  transfers: [],
  currentBank: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchBanks = createAsyncThunk(
  'banks/fetchBanks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/banks');
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to fetch banks');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createBank = createAsyncThunk(
  'banks/createBank',
  async (bankData: BankCreateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create bank');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const updateBank = createAsyncThunk(
  'banks/updateBank',
  async ({ id, ...bankData }: BankUpdateData, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/banks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to update bank');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const deleteBank = createAsyncThunk(
  'banks/deleteBank',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/banks/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to delete bank');
      }
      
      return id;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createBankTransfer = createAsyncThunk(
  'banks/createBankTransfer',
  async (transferData: BankTransferCreateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/bank-transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create bank transfer');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const fetchBankTransfers = createAsyncThunk(
  'banks/fetchBankTransfers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/bank-transfers');
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to fetch bank transfers');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

// Slice
const bankSlice = createSlice({
  name: 'banks',
  initialState,
  reducers: {
    setCurrentBank: (state, action) => {
      state.currentBank = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch banks
      .addCase(fetchBanks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBanks.fulfilled, (state, action) => {
        state.loading = false;
        state.banks = action.payload;
      })
      .addCase(fetchBanks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create bank
      .addCase(createBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBank.fulfilled, (state, action) => {
        state.loading = false;
        state.banks.unshift(action.payload);
      })
      .addCase(createBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update bank
      .addCase(updateBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBank.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.banks.findIndex(bank => bank._id === action.payload._id);
        if (index !== -1) {
          state.banks[index] = action.payload;
        }
      })
      .addCase(updateBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete bank
      .addCase(deleteBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBank.fulfilled, (state, action) => {
        state.loading = false;
        state.banks = state.banks.filter(bank => bank._id !== action.payload);
      })
      .addCase(deleteBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create bank transfer
      .addCase(createBankTransfer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBankTransfer.fulfilled, (state, action) => {
        state.loading = false;
        state.transfers.unshift(action.payload);
      })
      .addCase(createBankTransfer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch bank transfers
      .addCase(fetchBankTransfers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankTransfers.fulfilled, (state, action) => {
        state.loading = false;
        state.transfers = action.payload;
      })
      .addCase(fetchBankTransfers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentBank, clearError } = bankSlice.actions;
export default bankSlice.reducer;