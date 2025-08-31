"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchBanks, 
  createBank, 
  updateBank, 
  deleteBank,
  clearError 
} from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, DollarSign, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface BankFormData {
  bankName: string;
  accountNumber: string;
  balance: number;
  appUserId: string;
}

interface BankCreateData {
  bankName: string;
  accountNumber: string;
  balance: number;
  appUserId: string;
}

interface BankUpdateData {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  appUserId: string;
}

const BankManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { banks, loading, error } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [formData, setFormData] = useState<BankFormData>({
    bankName: '',
    accountNumber: '',
    balance: 0,
    appUserId: '',
  });

  useEffect(() => {
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'balance' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, appUserId: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankName || !formData.accountNumber || !formData.appUserId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingBank) {
        const updateData: BankUpdateData = { id: editingBank._id, ...formData };
        await dispatch(updateBank(updateData)).unwrap();
        toast.success('Bank updated successfully');
      } else {
        const createData: BankCreateData = { ...formData };
        await dispatch(createBank(createData)).unwrap();
        toast.success('Bank created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error || 'Operation failed');
    }
  };

  const handleEdit = (bank: any) => {
    setEditingBank(bank);
    setFormData({
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      balance: bank.balance,
      appUserId: bank.appUserId._id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this bank?')) {
      try {
        await dispatch(deleteBank(id)).unwrap();
        toast.success('Bank deleted successfully');
      } catch (error: any) {
        toast.error(error || 'Failed to delete bank');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      bankName: '',
      accountNumber: '',
      balance: 0,
      appUserId: '',
    });
    setEditingBank(null);
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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Bank Management</h1>
            <p className="text-gray-600">Manage bank accounts and balances</p>
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
              Add Bank
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingBank ? 'Edit Bank' : 'Add New Bank'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="Enter bank name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="Enter account number"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="balance">Initial Balance</Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="appUserId">App User *</Label>
                <Select value={formData.appUserId} onValueChange={handleSelectChange}>
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
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingBank ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Banks</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{banks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(banks.reduce((sum, bank) => sum + bank.balance, 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Banks</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {banks.filter(bank => bank.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Banks List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading banks...</div>
          ) : banks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No banks found. Create your first bank account.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>App User</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((bank) => (
                  <TableRow key={bank._id}>
                    <TableCell className="font-medium">{bank.bankName}</TableCell>
                    <TableCell>{bank.accountNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{bank.appUserId.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${bank.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(bank.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bank.isActive ? 'default' : 'secondary'}>
                        {bank.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(bank.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(bank)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(bank._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default BankManagement;