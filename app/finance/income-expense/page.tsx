"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchIncomes,
  fetchExpenses,
  createIncome,
  createExpense,
  clearError,
  IncomeCreateData,
  ExpenseCreateData
} from '@/lib/redux/slices/financeSlice';
import { fetchBanks } from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface IncomeFormData extends IncomeCreateData {}

interface ExpenseFormData extends ExpenseCreateData {}

const IncomeExpenseManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { incomes, expenses, loading, error } = useSelector((state: RootState) => state.finance);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('income');
  
  const [incomeFormData, setIncomeFormData] = useState<IncomeFormData>({
    appUserId: '',
    bankId: '',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [expenseFormData, setExpenseFormData] = useState<ExpenseFormData>({
    appUserId: '',
    bankId: '',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

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

  useEffect(() => {
    dispatch(fetchIncomes());
    dispatch(fetchExpenses());
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleIncomeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setIncomeFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleExpenseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExpenseFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleIncomeSelectChange = (name: string, value: string) => {
    setIncomeFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExpenseSelectChange = (name: string, value: string) => {
    setExpenseFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeFormData.appUserId || !incomeFormData.bankId || !incomeFormData.category || incomeFormData.amount <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    try {
      await dispatch(createIncome(incomeFormData)).unwrap();
      toast.success('Income record created successfully');
      setIsIncomeDialogOpen(false);
      resetIncomeForm();
      // Refresh data
      dispatch(fetchIncomes());
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to create income record');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.appUserId || !expenseFormData.bankId || !expenseFormData.category || expenseFormData.amount <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    try {
      await dispatch(createExpense(expenseFormData)).unwrap();
      toast.success('Expense record created successfully');
      setIsExpenseDialogOpen(false);
      resetExpenseForm();
      // Refresh data
      dispatch(fetchExpenses());
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to create expense record');
    }
  };

  const resetIncomeForm = () => {
    setIncomeFormData({
      appUserId: '',
      bankId: '',
      category: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      appUserId: '',
      bankId: '',
      category: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getActiveBanks = () => {
    return banks.filter(bank => bank.isActive);
  };

  const getUserBanks = (userId: string) => {
    return banks.filter(bank => bank.isActive && bank.appUserId._id === userId);
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

      {/* Tabs for Income and Expense */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="income">Income Records</TabsTrigger>
            <TabsTrigger value="expense">Expense Records</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            {activeTab === 'income' && (
              <Dialog open={isIncomeDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  resetIncomeForm();
                }
                setIsIncomeDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Income
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Income Record</DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleIncomeSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="appUserId">App User *</Label>
                      <Select 
                        value={incomeFormData.appUserId} 
                        onValueChange={(value) => handleIncomeSelectChange('appUserId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select app user" />
                        </SelectTrigger>
                        <SelectContent>
                          {appUsers.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name} 
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="bankId">Bank Account *</Label>
                      <Select 
                        value={incomeFormData.bankId} 
                        onValueChange={(value) => handleIncomeSelectChange('bankId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {(incomeFormData.appUserId ? getUserBanks(incomeFormData.appUserId) : getActiveBanks()).map((bank) => (
                            <SelectItem key={bank._id} value={bank._id}>
                              {bank.bankName} - {bank.accountNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select 
                        value={incomeFormData.category} 
                        onValueChange={(value) => handleIncomeSelectChange('category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={incomeFormData.amount}
                        onChange={handleIncomeInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={incomeFormData.date}
                        onChange={handleIncomeInputChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={incomeFormData.description}
                        onChange={handleIncomeInputChange}
                        placeholder="Enter description (optional)"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsIncomeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Income'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            
            {activeTab === 'expense' && (
              <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  resetExpenseForm();
                }
                setIsExpenseDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Expense Record</DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="appUserId">App User *</Label>
                      <Select 
                        value={expenseFormData.appUserId} 
                        onValueChange={(value) => handleExpenseSelectChange('appUserId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select app user" />
                        </SelectTrigger>
                        <SelectContent>
                          {appUsers.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="bankId">Bank Account *</Label>
                      <Select 
                        value={expenseFormData.bankId} 
                        onValueChange={(value) => handleExpenseSelectChange('bankId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {(expenseFormData.appUserId ? getUserBanks(expenseFormData.appUserId) : getActiveBanks()).map((bank) => (
                            <SelectItem key={bank._id} value={bank._id}>
                              {bank.bankName} - {bank.accountNumber} 
                              <span className="text-green-600 ml-2">
                                ({formatCurrency(bank.balance)})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select 
                        value={expenseFormData.category} 
                        onValueChange={(value) => handleExpenseSelectChange('category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={expenseFormData.amount}
                        onChange={handleExpenseInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={expenseFormData.date}
                        onChange={handleExpenseInputChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={expenseFormData.description}
                        onChange={handleExpenseInputChange}
                        placeholder="Enter description (optional)"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Expense'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App User</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App User</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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