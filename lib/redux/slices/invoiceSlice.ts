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
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.customerName) queryParams.append('customerName', params.customerName);
    if (params.lrNo) queryParams.append('lrNo', params.lrNo);
    
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
      });
  },
});

export const { clearError, setCurrentInvoice } = invoiceSlice.actions;
export default invoiceSlice.reducer;