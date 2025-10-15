"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as z from "zod";
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchDriverBudgets,
  createDriverBudget,
  clearError 
} from '@/lib/redux/slices/operationsSlice';
import { fetchBanks } from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { fetchDrivers } from '@/lib/redux/slices/driverSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DownloadButton } from '@/components/common/DownloadButton';
import { FormDialog } from '@/components/common/FormDialog';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Users, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// Zod schema for driver budget validation
const driverBudgetSchema = z.object({
  appUserId: z.string().min(1, "App user is required"),
  bankId: z.string().min(1, "Bank account is required"),
  driverId: z.string().min(1, "Driver is required"),
  dailyBudgetAmount: z.number().min(0.01, "Daily budget amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  paymentType: z.string().min(1, "Payment type is required"),
});

// Field configuration for FormDialog
const driverBudgetFields = [
  {
    name: "appUserId",
    label: "App User",
    type: "select" as const,
    placeholder: "Select app user",
    required: true,
  },
  {
    name: "bankId",
    label: "Bank Account",
    type: "select" as const,
    placeholder: "Select bank account",
    required: true,
  },
  {
    name: "driverId",
    label: "Driver",
    type: "select" as const,
    placeholder: "Select driver",
    required: true,
  },
  {
    name: "dailyBudgetAmount",
    label: "Daily Budget Amount",
    type: "number" as const,
    placeholder: "Enter daily budget amount",
    required: true,
  },
  {
    name: "date",
    label: "Date",
    type: "date" as const,
    placeholder: "Select date",
    required: true,
  },
  {
    name: "paymentType",
    label: "Payment Type",
    type: "select" as const,
    placeholder: "Select payment type",
    options: [
      { value: "Cash", label: "Cash" },
      { value: "UPI", label: "UPI" },
      { value: "Net Banking", label: "Net Banking" },
      { value: "Credit Card", label: "Credit Card" },
      { value: "Debit Card", label: "Debit Card" },
      { value: "Cheque", label: "Cheque" },
    ],
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    placeholder: "Enter description (optional)",
    required: false,
  },
];

// Default values for the form
const defaultValues = {
  appUserId: "",
  bankId: "",
  driverId: "",
  dailyBudgetAmount: 0,
  date: new Date().toISOString().split('T')[0],
  description: "",
  paymentType: "",
};

interface DriverBudgetFormData {
  appUserId: string;
  bankId: string;
  driverId: string;
  dailyBudgetAmount: number;
  date: string;
  description: string;
  paymentType: string;
}

const DriverBudgetManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { driverBudgets, driverBudgetsPagination, loading, error } = useSelector((state: RootState) => state.operations);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { drivers } = useSelector((state: RootState) => state.drivers);
  
  const [selectedAppUserId, setSelectedAppUserId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [previousBudgetAmount, setPreviousBudgetAmount] = useState<number>(0);

  // Helper function to generate dynamic field options
  const generateFieldsWithOptions = (selectedAppUserId?: string) => {
    const baseFields = driverBudgetFields.map(field => {
      if (field.name === "appUserId") {
        return {
          ...field,
          options: appUsers.map(user => ({
            value: user._id,
            label: user.name
          }))
        };
      }
      if (field.name === "bankId") {
        const filteredBanks = selectedAppUserId 
          ? banks.filter(bank => bank.isActive && bank.appUserId._id === selectedAppUserId)
          : banks.filter(bank => bank.isActive);
        return {
          ...field,
          options: filteredBanks.map(bank => ({
            value: bank._id,
            label: `${bank.bankName} - ${bank.accountNumber} (${formatCurrency(bank.balance)})`
          }))
        };
      }
      if (field.name === "driverId") {
        return {
          ...field,
          options: drivers.map(driver => ({
            value: driver._id,
            label: driver.name
          }))
        };
      }
      if (field.name === "dailyBudgetAmount" && selectedDriverId && previousBudgetAmount > 0) {
        return {
          ...field,
          placeholder: `Enter new budget amount (${formatCurrency(previousBudgetAmount)} will be added automatically)`
        };
      }
      return field;
    });

    // Add carry-forward budget information field if a driver is selected and has previous budget
    if (selectedDriverId && previousBudgetAmount > 0) {
      // Insert the carry-forward info field after driverId (index 2) and before dailyBudgetAmount
      const carryForwardField: any = {
        name: "carryForwardInfo",
        label: "Previous Budget Carry-Forward",
        type: "info",
        value: `${formatCurrency(previousBudgetAmount)} from previous record will be added to the new budget amount you enter`,
        required: false,
      };
      
      baseFields.splice(3, 0, carryForwardField);
    }

    return baseFields;
  };

  useEffect(() => {
    dispatch(fetchDriverBudgets({ page: driverBudgetsPagination.page, limit: driverBudgetsPagination.limit }));
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
    dispatch(fetchDrivers());
  }, [dispatch, driverBudgetsPagination.page, driverBudgetsPagination.limit]);

  const handlePageChange = (page: number) => {
    dispatch(fetchDriverBudgets({ page, limit: driverBudgetsPagination.limit }));
  };

  const handleLimitChange = (limit: number) => {
    dispatch(fetchDriverBudgets({ page: 1, limit }));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Generate dynamic default values
  const getDefaultValues = () => ({
    appUserId: selectedAppUserId || "",
    bankId: "",
    driverId: selectedDriverId || "",
    dailyBudgetAmount: 0, // User enters new amount, previous amount will be added during submission
    date: new Date().toISOString().split('T')[0],
    description: "",
    paymentType: "",
  });

  const handleSubmit = async (data: any): Promise<void> => {
    try {
      // Add previous budget amount to the entered amount if carry-forward is applicable
      const finalData = { ...data };
      if (selectedDriverId && previousBudgetAmount > 0) {
        finalData.dailyBudgetAmount = data.dailyBudgetAmount + previousBudgetAmount;
        toast.info(`Added ${formatCurrency(previousBudgetAmount)} carry-forward amount. Total: ${formatCurrency(finalData.dailyBudgetAmount)}`);
      }
      
      await dispatch(createDriverBudget(finalData)).unwrap();
      toast.success('Driver budget allocated successfully');
      // Refresh data
      dispatch(fetchDriverBudgets({ page: driverBudgetsPagination.page, limit: driverBudgetsPagination.limit }));
      dispatch(fetchBanks());
      
      // Reset carry-forward state after successful submission
      setSelectedDriverId("");
      setPreviousBudgetAmount(0);
    } catch (error: any) {
      toast.error(error || 'Failed to allocate driver budget');
      throw error; // Re-throw to let FormDialog handle the error
    }
  };

  const handleFieldChange = async (fieldName: string, value: any, currentValues: Record<string, any>) => {
    if (fieldName === "appUserId") {
      setSelectedAppUserId(value);
    }
    
    if (fieldName === "driverId") {
      setSelectedDriverId(value);
      
      // Fetch latest driver budget record to get previous budget amount for carry-forward
      try {
        const response = await fetch(`/api/driver-budgets/latest/${value}`);
        let previousBudget = 0;
        
        if (response.ok) {
          const latestBudgetRecord = await response.json();
          previousBudget = latestBudgetRecord.remainingBudgetAmount || latestBudgetRecord.dailyBudgetAmount || 0;
        }
        
        // Update previous budget amount state
        setPreviousBudgetAmount(previousBudget);
        
      } catch (error) {
        console.error('Error fetching latest driver budget record:', error);
        setPreviousBudgetAmount(0);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const totalBudgetAllocated = driverBudgets.reduce((sum, budget) => sum + budget.dailyBudgetAmount, 0);
  const uniqueDrivers = new Set(driverBudgets.map(budget => budget.driverId._id)).size;
  const todaysBudgets = driverBudgets.filter(budget => 
    new Date(budget.date).toDateString() === new Date().toDateString()
  ).length;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Driver Budget Management</h1>
            <p className="text-gray-600">Allocate daily budgets to drivers</p>
          </div>
        
        <div className="flex space-x-2">
          <DownloadButton module="driver-budgets" data={driverBudgets} />
          <FormDialog
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Allocate Budget
              </Button>
            }
            title="Allocate Driver Budget"
            description="Create a new driver budget allocation"
            schema={driverBudgetSchema}
            fields={generateFieldsWithOptions(selectedAppUserId)}
            defaultValues={getDefaultValues()}
            onSubmit={handleSubmit}
            onFieldChange={handleFieldChange}
            submitLabel="Allocate Budget"
            isLoading={loading}
            mode="create"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverBudgets.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalBudgetAllocated)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers with Budget</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueDrivers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Budgets</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysBudgets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Budget History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading driver budgets...</div>
          ) : driverBudgets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No driver budgets found. Allocate your first driver budget.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App User</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Budget Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverBudgets.map((budget) => (
                  <TableRow key={budget._id}>
                    <TableCell>
                      <div className="font-medium">{budget.appUserId.name}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{budget.bankId.bankName}</div>
                        <div className="text-sm text-gray-500">{budget.bankId.accountNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{budget.driverId.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-red-600">
                        {formatCurrency(budget.dailyBudgetAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(budget.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {budget.description || 'No description'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(budget.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {driverBudgets.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={driverBudgetsPagination.page}
                totalPages={driverBudgetsPagination.pages}
                onPageChange={handlePageChange}
                itemsPerPage={driverBudgetsPagination.limit}
                onItemsPerPageChange={handleLimitChange}
                totalItems={driverBudgetsPagination.total}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
};

export default DriverBudgetManagement;