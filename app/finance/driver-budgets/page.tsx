"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';

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
  const { driverBudgets, loading, error } = useSelector((state: RootState) => state.operations);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { drivers } = useSelector((state: RootState) => state.drivers);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [carryForwardBudget, setCarryForwardBudget] = useState(0);
  const [formData, setFormData] = useState<DriverBudgetFormData>({
    appUserId: '',
    bankId: '',
    driverId: '',
    dailyBudgetAmount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentType: '',
  });

  const paymentTypes = [
    "Cash",
    "UPI",
    "Net Banking",
    "Credit Card",
    "Debit Card",
    "Cheque"
  ];

  useEffect(() => {
    dispatch(fetchDriverBudgets());
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
    dispatch(fetchDrivers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dailyBudgetAmount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = async (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Fetch carry-forward budget when driver is selected
    if (name === 'driverId' && value) {
      try {
        const response = await fetch(`/api/driver-budgets/latest/${value}`);
        if (response.ok) {
          const budgetData = await response.json();
          setCarryForwardBudget(budgetData.remainingBudgetAmount || 0);
        } else {
          setCarryForwardBudget(0);
        }
      } catch (error) {
        console.error('Error fetching driver budget:', error);
        setCarryForwardBudget(0);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appUserId || !formData.bankId || !formData.driverId || formData.dailyBudgetAmount <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    try {
      await dispatch(createDriverBudget(formData)).unwrap();
      toast.success('Driver budget allocated successfully');
      setIsDialogOpen(false);
      resetForm();
      // Refresh data
      dispatch(fetchDriverBudgets());
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to allocate driver budget');
    }
  };

  const resetForm = () => {
    setFormData({
      appUserId: '',
      bankId: '',
      driverId: '',
      dailyBudgetAmount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentType: '',
    });
    setCarryForwardBudget(0);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
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

  const getSelectedBank = () => {
    return banks.find(bank => bank._id === formData.bankId);
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
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Allocate Budget
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Allocate Driver Budget</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="appUserId">App User *</Label>
                <Select 
                  value={formData.appUserId} 
                  onValueChange={(value) => handleSelectChange('appUserId', value)}
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
                  value={formData.bankId} 
                  onValueChange={(value) => handleSelectChange('bankId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.appUserId ? getUserBanks(formData.appUserId) : getActiveBanks()).map((bank) => (
                      <SelectItem key={bank._id} value={bank._id}>
                        {bank.bankName} - {bank.accountNumber}
                        <span className="text-green-600 ml-2">
                          ({formatCurrency(bank.balance)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.bankId && (
                  <p className="text-sm text-gray-500 mt-1">
                    Available balance: {formatCurrency(getSelectedBank()?.balance || 0)}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="driverId">Driver *</Label>
                <Select 
                  value={formData.driverId} 
                  onValueChange={(value) => handleSelectChange('driverId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver._id} value={driver._id}>
                        {driver.name}
                        <span className="text-sm text-gray-500 ml-2">
                          ({driver.mobileNo})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dailyBudgetAmount">Daily Budget Amount *</Label>
                <Input
                  id="dailyBudgetAmount"
                  name="dailyBudgetAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.dailyBudgetAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
                {carryForwardBudget > 0 && (
                  <p className="text-sm mt-1 text-blue-600">
                    Carry Forward: +{carryForwardBudget.toFixed(2)}
                  </p>
                )}
                {formData.bankId && formData.dailyBudgetAmount > 0 && (
                  <p className={`text-sm mt-1 ${
                    formData.dailyBudgetAmount > (getSelectedBank()?.balance || 0) 
                      ? 'text-red-500' 
                      : 'text-green-600'
                  }`}>
                    {formData.dailyBudgetAmount > (getSelectedBank()?.balance || 0) 
                      ? 'Insufficient balance' 
                      : 'Budget amount is valid'
                    }
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter budget description (optional)"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="paymentType">Payment Type *</Label>
                <Select 
                  value={formData.paymentType} 
                  onValueChange={(value) => handleSelectChange('paymentType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || formData.dailyBudgetAmount > (getSelectedBank()?.balance || 0)}
                >
                  {loading ? 'Allocating...' : 'Allocate Budget'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
};

export default DriverBudgetManagement;