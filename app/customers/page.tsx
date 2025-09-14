"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import * as z from "zod";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FormDialog } from "@/components/common/FormDialog";
import { ViewDialog } from "@/components/common/ViewDialog";
import { DownloadButton } from "@/components/common/DownloadButton";
import { ProductsManager } from "./components/ProductsManager";
import { CustomerDialog } from "./components/CustomerDialog";
import { CustomerDetails } from "./components/CustomerDetails";

import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchCustomers,
  deleteCustomer,
  createCustomer,
  updateCustomer,
  Customer,
  Product,
  Category,
} from "@/lib/redux/slices/customerSlice";

// Schema for customer validation
const categorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  categoryRate: z.number().min(0, "Rate must be a positive number"),
});

const productSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productRate: z.number().min(0, "Rate must be a positive number"),
  categories: z.array(categorySchema).optional(),
});

const customerSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  mobileNo: z.string().min(10, "Mobile number must be at least 10 digits"),
  products: z.array(productSchema).optional().default([]),
});

// Form fields configuration
const customerFields = [
  {
    name: "customerName",
    label: "Customer Name",
    type: "text" as const,
    placeholder: "Enter customer name",
    required: true,
  },
  {
    name: "companyName",
    label: "Company Name",
    type: "text" as const,
    placeholder: "Enter company name",
    required: true,
  },
  {
    name: "mobileNo",
    label: "Mobile Number",
    type: "text" as const,
    placeholder: "Enter mobile number",
    required: true,
  },
];

const defaultValues = {
  customerName: "",
  companyName: "",
  mobileNo: "",
  products: [],
};

export default function CustomersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { customers, isLoading, error } = useSelector(
    (state: RootState) => state.customers
  );
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<"none" | "products" | "details">("none");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    // Initialize empty products array if not provided
    const customerData = {
      ...data,
      products: data.products || [],
    };
    await dispatch(createCustomer(customerData)).unwrap();
    // Refresh the customers list to show updated data
    await dispatch(fetchCustomers()).unwrap();
  };

  const handleEdit = async (data: any, id: string) => {
    await dispatch(updateCustomer({ id, data })).unwrap();
    // Refresh the customers list to show updated data
    await dispatch(fetchCustomers()).unwrap();
  };
  
  const handleProductsChange = (products: Product[]) => {
    if (!currentCustomer) return;
    
    // Only update the local state, don't save to database immediately
    setCurrentCustomer({
      ...currentCustomer,
      products,
    });
  };
  
  const handleSaveProducts = async () => {
    if (!currentCustomer) return;
    
    try {
      await dispatch(updateCustomer({
        id: currentCustomer._id,
        data: currentCustomer,
      })).unwrap();
      
      // Refresh the customers list to get the updated data
      await dispatch(fetchCustomers()).unwrap();
      setViewMode("none");
      setCurrentCustomer(null);
    } catch (error) {
      console.error('Failed to save products:', error);
    }
  };
  
  const openProductsManager = (customer: Customer) => {
    setCurrentCustomer(customer);
    setViewMode("products");
  };
  
  const openCustomerDetails = (customer: Customer) => {
    setCurrentCustomer(customer);
    setViewMode("details");
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      // Refresh the customers list to show updated data
      await dispatch(fetchCustomers()).unwrap();
    } catch (error) {
      console.error("Failed to delete customer:", error);
    }
  };

  if (isLoading && customers.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="text-muted-foreground">
                Manage your customers, products, and categories
              </p>
            </div>

            <div className="flex gap-2">
              <DownloadButton
                module="customers"
                data={customers}
              />
              <CustomerDialog
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Customer
                  </Button>
                }
                title="Create Customer"
                description="Add a new customer to the system"
                defaultValues={defaultValues}
                onSubmit={handleCreate}
                isLoading={isLoading}
                mode="create"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Customers ({customers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Mobile No</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell className="font-medium">
                        {customer.customerName}
                      </TableCell>
                      <TableCell>{customer.companyName}</TableCell>
                      <TableCell>{customer.mobileNo}</TableCell>
                      <TableCell>
                        <Badge>{customer.products?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openCustomerDetails(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <CustomerDialog
                            trigger={
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                            title={`Edit Customer: ${customer.customerName}`}
                            description="Update customer information"
                            defaultValues={{
                              customerName: customer.customerName,
                              companyName: customer.companyName,
                              mobileNo: customer.mobileNo,
                              products: customer.products || [],
                            }}
                            onSubmit={(data) => handleEdit(data, customer._id)}
                            isLoading={isLoading}
                            mode="edit"
                            key={`edit-${customer._id}-${JSON.stringify(customer.products)}`}
                          />

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the customer "{customer.customerName}"
                                  and all associated products and categories.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(customer._id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={isLoading}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {customers.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No customers found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get started by creating your first customer
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {viewMode === "products" && currentCustomer && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Products for {currentCustomer.customerName}</span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveProducts}
                      disabled={isLoading}
                    >
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setViewMode("none");
                        setCurrentCustomer(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProductsManager
                  products={currentCustomer.products || []}
                  onChange={handleProductsChange}
                />
              </CardContent>
            </Card>
          )}
          
          {viewMode === "details" && currentCustomer && (
            <div className="mt-6">
              <CustomerDetails 
                customer={currentCustomer} 
                onClose={() => setViewMode("none")} 
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}