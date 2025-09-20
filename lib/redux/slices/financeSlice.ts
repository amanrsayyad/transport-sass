import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface Income {
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
  category: string;
  amount: number;
  description: string;
  date: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
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
  category: string;
  amount: number;
  description: string;
  date: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Create data interfaces for form submissions
export interface IncomeCreateData {
  appUserId: string;
  bankId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface ExpenseCreateData {
  appUserId: string;
  bankId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface FinanceState {
  incomes: Income[];
  expenses: Expense[];
  currentIncome: Income | null;
  currentExpense: Expense | null;
  loading: boolean;
  error: string | null;
  incomesPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  expensesPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: FinanceState = {
  incomes: [],
  expenses: [],
  currentIncome: null,
  currentExpense: null,
  loading: false,
  error: null,
  incomesPagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  expensesPagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
};

// Async thunks for Income
export const fetchIncomes = createAsyncThunk(
  'finance/fetchIncomes',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/income?${queryParams}`);
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to fetch incomes');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createIncome = createAsyncThunk(
  'finance/createIncome',
  async (incomeData: IncomeCreateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create income');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

// Async thunks for Expense
export const fetchExpenses = createAsyncThunk(
  'finance/fetchExpenses',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/expenses?${queryParams}`);
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to fetch expenses');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createExpense = createAsyncThunk(
  'finance/createExpense',
  async (expenseData: ExpenseCreateData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create expense');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

// Slice
const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setCurrentIncome: (state, action) => {
      state.currentIncome = action.payload;
    },
    setCurrentExpense: (state, action) => {
      state.currentExpense = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch incomes
      .addCase(fetchIncomes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncomes.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.incomes = action.payload.data;
          state.incomesPagination = {
            page: action.payload.page || 1,
            limit: action.payload.limit || 10,
            total: action.payload.total || 0,
            pages: action.payload.pages || 0
          };
        } else {
          state.incomes = action.payload;
        }
      })
      .addCase(fetchIncomes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create income
      .addCase(createIncome.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createIncome.fulfilled, (state, action) => {
        state.loading = false;
        state.incomes.unshift(action.payload);
      })
      .addCase(createIncome.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch expenses
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.expenses = action.payload.data;
          state.expensesPagination = {
            page: action.payload.page || 1,
            limit: action.payload.limit || 10,
            total: action.payload.total || 0,
            pages: action.payload.pages || 0
          };
        } else {
          state.expenses = action.payload;
        }
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create expense
      .addCase(createExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses.unshift(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentIncome, setCurrentExpense, clearError } = financeSlice.actions;
export default financeSlice.reducer;