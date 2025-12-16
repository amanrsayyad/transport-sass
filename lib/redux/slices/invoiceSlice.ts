import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface InvoiceRow {
  product: string;
  truckNo: string;
  articles?: string;
  weight?: number;
  rate?: number;
  total?: number;
  remarks?: string;
}

export interface Invoice {
  _id: string;
  date: string;
  from: string;
  to: string;
  taluka?: string;
  dist?: string;
  customerName: string;
  consignor?: string;
  consignee?: string;
  lrNo: string;
  remarks?: string;
  total: number;
  taxPercent?: number;
  taxAmount?: number;
  advanceAmount?: number;
  remainingAmount?: number;
  appUserId?: string | { _id: string };
  status: 'Paid' | 'Unpaid' | 'Pending';
  rows: InvoiceRow[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceCreateData {
  date: string;
  from: string;
  to: string;
  taluka?: string;
  dist?: string;
  customerName: string;
  consignor?: string;
  consignee?: string;
  lrNo?: string;
  remarks?: string;
  taxPercent?: number;
  advanceAmount?: number;
  appUserId?: string;
  status?: 'Paid' | 'Unpaid' | 'Pending';
  rows: InvoiceRow[];
}

interface InvoiceState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: InvoiceState = {
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
};

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    customerName?: string;
    lrNo?: string;
    fromDate?: string;
    toDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.customerName) queryParams.append('customerName', params.customerName);
    if (params.lrNo) queryParams.append('lrNo', params.lrNo);
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    
    const response = await fetch(`/api/invoices?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    return response.json();
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'invoices/fetchInvoiceById',
  async (id: string) => {
    const response = await fetch(`/api/invoices/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch invoice');
    }
    return response.json();
  }
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData: InvoiceCreateData) => {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create invoice');
    }
    
    return response.json();
  }
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, invoiceData }: { id: string; invoiceData: Partial<InvoiceCreateData> }) => {
    const response = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update invoice');
    }
    
    return response.json();
  }
);

export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id: string) => {
    const response = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete invoice');
    }
    
    return { id };
  }
);

// Bulk update invoice statuses (and optionally generate income/transactions)
export const bulkUpdateInvoiceStatus = createAsyncThunk(
  'invoices/bulkUpdateInvoiceStatus',
  async (params: {
    invoiceIds: string[];
    status: 'Paid' | 'Unpaid';
    bankId?: string;
    appUserId?: string;
    category?: string;
    description?: string;
    date?: string;
  }) => {
    const response = await fetch('/api/invoices/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk update invoice statuses');
    }
    return response.json();
  }
);

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.currentInvoice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.invoices;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch invoices';
      })
      
      // Fetch invoice by ID
      .addCase(fetchInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch invoice';
      })
      
      // Create invoice
      .addCase(createInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices.unshift(action.payload);
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create invoice';
      })
      
      // Update invoice
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(invoice => invoice._id === action.payload._id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.currentInvoice && state.currentInvoice._id === action.payload._id) {
          state.currentInvoice = action.payload;
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update invoice';
      })
      
      // Delete invoice
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = state.invoices.filter(invoice => invoice._id !== action.payload.id);
        if (state.currentInvoice && state.currentInvoice._id === action.payload.id) {
          state.currentInvoice = null;
        }
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete invoice';
      })
      
      // Bulk update invoice status
      .addCase(bulkUpdateInvoiceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateInvoiceStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedInvoices: Invoice[] = action.payload.invoices;
        // Update matching invoices in state
        updatedInvoices.forEach((updated) => {
          const idx = state.invoices.findIndex((i) => i._id === updated._id);
          if (idx !== -1) {
            state.invoices[idx] = {
              ...state.invoices[idx],
              ...updated,
            } as Invoice;
          }
          if (state.currentInvoice && state.currentInvoice._id === updated._id) {
            state.currentInvoice = {
              ...state.currentInvoice,
              ...updated,
            } as Invoice;
          }
        });
      })
      .addCase(bulkUpdateInvoiceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to bulk update invoice statuses';
      });
  },
});

export const { clearError, setCurrentInvoice } = invoiceSlice.actions;
export default invoiceSlice.reducer;