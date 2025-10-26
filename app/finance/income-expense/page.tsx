"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchIncomes,
  fetchExpenses,
  createIncome,
  createExpense,
  updateIncome,
  updateExpense,
  deleteIncome,
  deleteExpense,
  clearError,
  IncomeCreateData,
  ExpenseCreateData
} from '@/lib/redux/slices/financeSlice';
import { fetchBanks } from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, TrendingUp, TrendingDown, DollarSign, Edit, Trash2, Eye, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { DownloadButton } from '@/components/common/DownloadButton';
import { FormDialog } from '@/components/common/FormDialog';
import { ViewDialog } from '@/components/common/ViewDialog';
import * as z from "zod";

// Schemas for validation
const incomeSchema = z.object({
  appUserId: z.string().min(1, "App User is required"),
  bankId: z.string().min(1, "Bank Account is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

const expenseSchema = z.object({
  appUserId: z.string().min(1, "App User is required"),
  bankId: z.string().min(1, "Bank Account is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

interface IncomeFormData extends IncomeCreateData {}
interface ExpenseFormData extends ExpenseCreateData {}

const IncomeExpenseManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { incomes, expenses, loading, error, incomesPagination, expensesPagination } = useSelector((state: RootState) => state.finance);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  
  const [activeTab, setActiveTab] = useState('income');
  
  // Filter states
  const [filters, setFilters] = useState({
    appUserId: '',
    bankId: '',
    startDate: '',
    endDate: ''
  });
  const [filteredBanks, setFilteredBanks] = useState<any[]>([]);

  const incomeCategories = [
    'Sales Revenue',
    'Service Income',
    'Investment Income',
    'Rental Income',
    'Commission',
    'Bonus',
    'Other Income'
  ];

  const expenseCategories = [
    'Fuel',
    'Maintenance',
    'Insurance',
    'Office Supplies',
    'Marketing',
    'Utilities',
    'Rent',
    'Salaries',
    'Travel',
    'Other Expenses'
  ];

  // Income form fields
  const incomeFields = [
    {
      name: "appUserId",
      label: "App User",
      type: "select" as const,
      required: true,
      options: appUsers.map(user => ({ value: user._id, label: user.name }))
    },
    {
      name: "bankId",
      label: "Bank Account",
      type: "select" as const,
      required: true,
      options: banks.filter(bank => bank.isActive).map(bank => ({ 
        value: bank._id, 
        label: `${bank.bankName} - ${bank.accountNumber}` 
      }))
    },
    {
      name: "category",
      label: "Category",
      type: "select" as const,
      required: true,
      options: incomeCategories.map(cat => ({ value: cat, label: cat }))
    },
    {
      name: "amount",
      label: "Amount",
      type: "number" as const,
      required: true,
      placeholder: "0.00",
      step: "0.01",
      min: "0.01"
    },
    {
      name: "date",
      label: "Date",
      type: "date" as const,
      required: true
    },
    {
      name: "description",
      label: "Description",
      type: "textarea" as const,
      required: false,
      placeholder: "Enter description (optional)"
    }
  ];

  // Expense form fields
  const expenseFields = [
    {
      name: "appUserId",
      label: "App User",
      type: "select" as const,
      required: true,
      options: appUsers.map(user => ({ value: user._id, label: user.name }))
    },
    {
      name: "bankId",
      label: "Bank Account",
      type: "select" as const,
      required: true,
      options: banks.filter(bank => bank.isActive).map(bank => ({ 
        value: bank._id, 
        label: `${bank.bankName} - ${bank.accountNumber}` 
      }))
    },
    {
      name: "category",
      label: "Category",
      type: "select" as const,
      required: true,
      options: expenseCategories.map(cat => ({ value: cat, label: cat }))
    },
    {
      name: "amount",
      label: "Amount",
      type: "number" as const,
      required: true,
      placeholder: "0.00",
      step: "0.01",
      min: "0.01"
    },
    {
      name: "date",
      label: "Date",
      type: "date" as const,
      required: true
    },
    {
      name: "description",
      label: "Description",
      type: "textarea" as const,
      required: false,
      placeholder: "Enter description (optional)"
    }
  ];

  // Default values
  const incomeDefaultValues = {
    appUserId: '',
    bankId: '',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  };

  const expenseDefaultValues = {
    appUserId: '',
    bankId: '',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  };

  // Function to fetch banks by user
  const fetchBanksByUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/app-users/${userId}/banks`);
      if (response.ok) {
        const banks = await response.json();
        setFilteredBanks(banks);
      } else {
        setFilteredBanks([]);
      }
    } catch (error) {
      console.error('Error fetching banks for user:', error);
      setFilteredBanks([]);
    }
  };

  // Function to apply filters
  const applyFilters = () => {
    const filterParams = {
      page: 1,
      limit: incomesPagination.limit,
      ...(filters.appUserId && { appUserId: filters.appUserId }),
      ...(filters.bankId && { bankId: filters.bankId }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    };

    dispatch(fetchIncomes(filterParams));
    dispatch(fetchExpenses({
      ...filterParams,
      limit: expensesPagination.limit
    }));
  };

  // Function to clear filters
  const clearFilters = () => {
    setFilters({
      appUserId: '',
      bankId: '',
      startDate: '',
      endDate: ''
    });
    setFilteredBanks([]);
  };

  useEffect(() => {
    dispatch(fetchIncomes({ page: incomesPagination.page, limit: incomesPagination.limit }));
    dispatch(fetchExpenses({ page: expensesPagination.page, limit: expensesPagination.limit }));
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
  }, [dispatch, incomesPagination.page, incomesPagination.limit, expensesPagination.page, expensesPagination.limit]);

  // Effect to fetch banks when user is selected
  useEffect(() => {
    if (filters.appUserId) {
      fetchBanksByUser(filters.appUserId);
      // Clear bank selection when user changes
      setFilters(prev => ({ ...prev, bankId: '' }));
    } else {
      setFilteredBanks([]);
    }
  }, [filters.appUserId]);

  const handleIncomePageChange = (page: number) => {
    const filterParams = {
      page,
      limit: incomesPagination.limit,
      ...(filters.appUserId && { appUserId: filters.appUserId }),
      ...(filters.bankId && { bankId: filters.bankId }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    };
    dispatch(fetchIncomes(filterParams));
  };

  const handleIncomeLimitChange = (limit: number) => {
    const filterParams = {
      page: 1,
      limit,
      ...(filters.appUserId && { appUserId: filters.appUserId }),
      ...(filters.bankId && { bankId: filters.bankId }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    };
    dispatch(fetchIncomes(filterParams));
  };

  const handleExpensePageChange = (page: number) => {
    const filterParams = {
      page,
      limit: expensesPagination.limit,
      ...(filters.appUserId && { appUserId: filters.appUserId }),
      ...(filters.bankId && { bankId: filters.bankId }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    };
    dispatch(fetchExpenses(filterParams));
  };

  const handleExpenseLimitChange = (limit: number) => {
    const filterParams = {
      page: 1,
      limit,
      ...(filters.appUserId && { appUserId: filters.appUserId }),
      ...(filters.bankId && { bankId: filters.bankId }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    };
    dispatch(fetchExpenses(filterParams));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Income handlers
  const handleCreateIncome = async (data: IncomeFormData) => {
    try {
      await dispatch(createIncome(data)).unwrap();
      toast.success('Income record created successfully');
      dispatch(fetchIncomes({ page: incomesPagination.page, limit: incomesPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to create income record');
      throw error;
    }
  };

  const handleEditIncome = async (data: IncomeFormData, income: any) => {
    try {
      await dispatch(updateIncome({ id: income._id, data })).unwrap();
      toast.success('Income record updated successfully');
      dispatch(fetchIncomes({ page: incomesPagination.page, limit: incomesPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to update income record');
      throw error;
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    try {
      await dispatch(deleteIncome(incomeId)).unwrap();
      toast.success('Income record deleted successfully');
      dispatch(fetchIncomes({ page: incomesPagination.page, limit: incomesPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to delete income record');
    }
  };

  // Expense handlers
  const handleCreateExpense = async (data: ExpenseFormData) => {
    try {
      await dispatch(createExpense(data)).unwrap();
      toast.success('Expense record created successfully');
      dispatch(fetchExpenses({ page: expensesPagination.page, limit: expensesPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to create expense record');
      throw error;
    }
  };

  const handleEditExpense = async (data: ExpenseFormData, expense: any) => {
    try {
      await dispatch(updateExpense({ id: expense._id, data })).unwrap();
      toast.success('Expense record updated successfully');
      dispatch(fetchExpenses({ page: expensesPagination.page, limit: expensesPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to update expense record');
      throw error;
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await dispatch(deleteExpense(expenseId)).unwrap();
      toast.success('Expense record deleted successfully');
      dispatch(fetchExpenses({ page: expensesPagination.page, limit: expensesPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to delete expense record');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netAmount = totalIncome - totalExpense;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Income & Expense Management</h1>
            <p className="text-gray-600">Track your income and expense records</p>
          </div>
          <DownloadButton module="income-expense" data={[...incomes, ...expenses]} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                {incomes.length} records
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpense)}
              </div>
              <p className="text-xs text-muted-foreground">
                {expenses.length} records
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Income - Expenses
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {incomes.length + expenses.length}
              </div>
              <p className="text-xs text-muted-foreground">
                All transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* User Filter */}
              <div className="space-y-2">
                <Label htmlFor="user-filter">Filter by User</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.appUserId || undefined}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, appUserId: value || '' }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {appUsers.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.appUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, appUserId: '', bankId: '' }))}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Bank Filter */}
              <div className="space-y-2">
                <Label htmlFor="bank-filter">Filter by Bank</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.bankId || undefined}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, bankId: value || '' }))}
                    disabled={!filters.appUserId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={filters.appUserId ? "Select bank..." : "Select user first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBanks.map((bank) => (
                        <SelectItem key={bank._id} value={bank._id}>
                          {bank.bankName} - {bank.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.bankId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, bankId: '' }))}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <div className="flex gap-2">
                  <Input
                    id="start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="flex-1"
                  />
                  {filters.startDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, startDate: '' }))}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <div className="flex gap-2">
                  <Input
                    id="end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="flex-1"
                  />
                  {filters.endDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, endDate: '' }))}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                disabled={!filters.appUserId && !filters.bankId && !filters.startDate && !filters.endDate}
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Income and Expense */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="income">Income Records</TabsTrigger>
              <TabsTrigger value="expense">Expense Records</TabsTrigger>
            </TabsList>
            
            <div className="flex space-x-2">
              {activeTab === 'income' && (
                <FormDialog
                  title="Add Income Record"
                  description="Create a new income record"
                  fields={incomeFields}
                  schema={incomeSchema}
                  defaultValues={incomeDefaultValues}
                  onSubmit={handleCreateIncome}
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Income
                    </Button>
                  }
                />
              )}
              
              {activeTab === 'expense' && (
                <FormDialog
                  title="Add Expense Record"
                  description="Create a new expense record"
                  fields={expenseFields}
                  schema={expenseSchema}
                  defaultValues={expenseDefaultValues}
                  onSubmit={handleCreateExpense}
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          <TabsContent value="income">
            <Card>
              <CardHeader>
                <CardTitle>Income Records</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading income records...</div>
                ) : incomes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No income records found. Create your first income record.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>App User</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomes.map((income) => (
                          <TableRow key={income._id}>
                            <TableCell>
                              <div className="font-medium">{income.appUserId.name}</div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{income.bankId.bankName}</div>
                                <div className="text-sm text-gray-500">{income.bankId.accountNumber}</div>
                              </div>
                            </TableCell>
                            <TableCell>{income.category}</TableCell>
                            <TableCell>
                              <span className="font-medium text-green-600">
                                {formatCurrency(income.amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {income.description || 'No description'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(income.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <ViewDialog
                                  title="Income Details"
                                  description="View income record details"
                                  fields={[
                                    { label: 'App User', value: income.appUserId.name },
                                    { label: 'Bank Account', value: `${income.bankId.bankName} - ${income.bankId.accountNumber}` },
                                    { label: 'Category', value: income.category },
                                    { label: 'Amount', value: formatCurrency(income.amount) },
                                    { label: 'Description', value: income.description || 'No description' },
                                    { label: 'Date', value: new Date(income.date).toLocaleDateString() },
                                  ]}
                                  trigger={
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <FormDialog
                                  title="Edit Income Record"
                                  description="Update the income record"
                                  fields={incomeFields}
                                  schema={incomeSchema}
                                  defaultValues={{
                                    appUserId: income.appUserId._id,
                                    bankId: income.bankId._id,
                                    category: income.category,
                                    amount: income.amount,
                                    description: income.description || '',
                                    date: new Date(income.date).toISOString().split('T')[0],
                                  }}
                                  onSubmit={(data) => handleEditIncome(data, income)}
                                  submitLabel="Update Record"
                                  isLoading={loading}
                                  mode="edit"
                                  trigger={
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Income Record</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this income record? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteIncome(income._id)}
                                        className="bg-red-600 hover:bg-red-700"
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
                    {incomes.length > 0 && (
                      <Pagination
                        currentPage={incomesPagination.page}
                        totalPages={incomesPagination.pages}
                        totalItems={incomesPagination.total}
                        itemsPerPage={incomesPagination.limit}
                        onPageChange={handleIncomePageChange}
                        onItemsPerPageChange={handleIncomeLimitChange}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expense">
            <Card>
              <CardHeader>
                <CardTitle>Expense Records</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading expense records...</div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No expense records found. Create your first expense record.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>App User</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense._id}>
                            <TableCell>
                              <div className="font-medium">{expense.appUserId.name}</div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{expense.bankId.bankName}</div>
                                <div className="text-sm text-gray-500">{expense.bankId.accountNumber}</div>
                              </div>
                            </TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>
                              <span className="font-medium text-red-600">
                                {formatCurrency(expense.amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {expense.description || 'No description'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(expense.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <ViewDialog
                                  title="Expense Details"
                                  description="View expense record details"
                                  fields={[
                                    { label: 'App User', value: expense.appUserId.name },
                                    { label: 'Bank Account', value: `${expense.bankId.bankName} - ${expense.bankId.accountNumber}` },
                                    { label: 'Category', value: expense.category },
                                    { label: 'Amount', value: formatCurrency(expense.amount) },
                                    { label: 'Description', value: expense.description || 'No description' },
                                    { label: 'Date', value: new Date(expense.date).toLocaleDateString() },
                                  ]}
                                  trigger={
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <FormDialog
                                  title="Edit Expense Record"
                                  description="Update the expense record"
                                  fields={expenseFields}
                                  schema={expenseSchema}
                                  defaultValues={{
                                    appUserId: expense.appUserId._id,
                                    bankId: expense.bankId._id,
                                    category: expense.category,
                                    amount: expense.amount,
                                    description: expense.description || '',
                                    date: new Date(expense.date).toISOString().split('T')[0],
                                  }}
                                  onSubmit={(data) => handleEditExpense(data, expense)}
                                  submitLabel="Update Record"
                                  isLoading={loading}
                                  mode="edit"
                                  trigger={
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Expense Record</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this expense record? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteExpense(expense._id)}
                                        className="bg-red-600 hover:bg-red-700"
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
                    {expenses.length > 0 && (
                      <Pagination
                        currentPage={expensesPagination.page}
                        totalPages={expensesPagination.pages}
                        totalItems={expensesPagination.total}
                        itemsPerPage={expensesPagination.limit}
                        onPageChange={handleExpensePageChange}
                        onItemsPerPageChange={handleExpenseLimitChange}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default IncomeExpenseManagement;