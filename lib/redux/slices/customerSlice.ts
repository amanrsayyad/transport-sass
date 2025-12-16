import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Category {
  _id?: string;
  categoryName: string;
  categoryRate: number;
}

export interface Product {
  _id?: string;
  productName: string;
  productRate: number;
  categories: Category[];
}

export interface Customer {
  _id: string;
  customerName: string;
  companyName: string;
  mobileNo: string;
  gstin?: string;
  address?: string;
  products: Product[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async () => {
    const response = await fetch("/api/customers");
    if (!response.ok) throw new Error("Failed to fetch customers");
    return response.json();
  }
);

export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData: Partial<Customer>) => {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create customer");
    }
    return response.json();
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, data }: { id: string; data: Partial<Customer> }) => {
    const response = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update customer");
    return response.json();
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/deleteCustomer",
  async (id: string) => {
    const response = await fetch(`/api/customers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete customer");
    return id;
  }
);

export const fetchProductsByCustomer = createAsyncThunk(
  "customers/fetchProductsByCustomer",
  async (customerName: string) => {
    const response = await fetch(`/api/customers/products/${encodeURIComponent(customerName)}`);
    if (!response.ok) throw new Error("Failed to fetch products");
    return response.json();
  }
);

export const fetchCategoriesByProduct = createAsyncThunk(
  "customers/fetchCategoriesByProduct",
  async (productName: string) => {
    const response = await fetch(`/api/customers/products/categories/${encodeURIComponent(productName)}`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return response.json();
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.currentCustomer = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customers
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch customers";
      })
      // Create customer
      .addCase(createCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers.unshift(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to create customer";
      })
      // Update customer
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.customers.findIndex(
          (customer) => customer._id === action.payload._id
        );
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
      })
      // Delete customer
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.customers = state.customers.filter(
          (customer) => customer._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentCustomer } = customerSlice.actions;
export default customerSlice.reducer;