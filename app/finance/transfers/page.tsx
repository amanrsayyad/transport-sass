"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchBanks,
  createBankTransfer,
  fetchBankTransfers,
  clearError,
  BankTransferCreateData
} from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DownloadButton } from '@/components/common/DownloadButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Plus, Send, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface TransferFormData extends BankTransferCreateData {
  fromAppUserId: string;
  toAppUserId: string;
}

const BankTransfers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { banks, transfers, loading, error } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TransferFormData>({
    fromAppUserId: '',
    fromBankId: '',
    toAppUserId: '',
    toBankId: '',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    dispatch(fetchBanks());
    dispatch(fetchBankTransfers());
    dispatch(fetchAppUsers());
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
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromAppUserId || !formData.fromBankId || !formData.toAppUserId || !formData.toBankId || formData.amount <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    if (formData.fromBankId === formData.toBankId) {
      toast.error('Source and destination banks must be different');
      return;
    }

    const fromBank = banks.find(bank => bank._id === formData.fromBankId);
    if (fromBank && formData.amount > fromBank.balance) {
      toast.error('Insufficient balance in source bank');
      return;
    }

    try {
      const transferData: BankTransferCreateData = {
        fromBankId: formData.fromBankId,
        toBankId: formData.toBankId,
        amount: formData.amount,
        description: formData.description,
      };
      
      await dispatch(createBankTransfer(transferData)).unwrap();
      toast.success('Transfer completed successfully');
      setIsDialogOpen(false);
      resetForm();
      // Refresh data
      dispatch(fetchBanks());
      dispatch(fetchBankTransfers());
    } catch (error: any) {
      toast.error(error || 'Transfer failed');
    }
  };

  const resetForm = () => {
    setFormData({
      fromAppUserId: '',
      fromBankId: '',
      toAppUserId: '',
      toBankId: '',
      amount: 0,
      description: '',
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getActiveBanks = () => {
    return banks.filter(bank => bank.isActive);
  };

  const getUserBanks = (userId: string) => {
    return banks.filter(bank => bank.isActive && bank.appUserId._id === userId);
  };

  const getFromBanks = () => {
    return formData.fromAppUserId ? getUserBanks(formData.fromAppUserId) : [];
  };

  const getToBanks = () => {
    return formData.toAppUserId ? getUserBanks(formData.toAppUserId) : [];
  };

  const getSelectedFromBank = () => {
    return banks.find(bank => bank._id === formData.fromBankId);
  };

  const getSelectedToBank = () => {
    return banks.find(bank => bank._id === formData.toBankId);
  };

  const totalTransferAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const completedTransfers = transfers.filter(transfer => transfer.status === 'COMPLETED').length;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bank Transfers</h1>
          <p className="text-gray-600">Transfer funds between bank accounts</p>
        </div>
        
        <div className="flex space-x-2">
          <DownloadButton module="transfers" data={transfers} filters={{}} />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Transfer
              </Button>
            </DialogTrigger>
            
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Bank Transfer</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromAppUserId">From App User *</Label>
                  <Select 
                    value={formData.fromAppUserId} 
                    onValueChange={(value) => {
                      handleSelectChange('fromAppUserId', value);
                      // Reset from bank when app user changes
                      setFormData(prev => ({ ...prev, fromBankId: '' }));
                    }}
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
                  <Label htmlFor="toAppUserId">To App User *</Label>
                  <Select 
                    value={formData.toAppUserId} 
                    onValueChange={(value) => {
                      handleSelectChange('toAppUserId', value);
                      // Reset to bank when app user changes
                      setFormData(prev => ({ ...prev, toBankId: '' }));
                    }}
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
              </div>
              
              <div>
                <Label htmlFor="fromBankId">From Bank *</Label>
                <Select 
                  value={formData.fromBankId} 
                  onValueChange={(value) => handleSelectChange('fromBankId', value)}
                  disabled={!formData.fromAppUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.fromAppUserId ? "Select source bank" : "Select app user first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFromBanks().filter(bank => bank.balance > 0).map((bank) => (
                      <SelectItem key={bank._id} value={bank._id}>
                        {bank.bankName} - {bank.accountNumber} 
                        <span className="text-green-600 ml-2">
                          ({formatCurrency(bank.balance)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.fromBankId && (
                  <p className="text-sm text-gray-500 mt-1">
                    Available balance: {formatCurrency(getSelectedFromBank()?.balance || 0)}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="toBankId">To Bank *</Label>
                <Select 
                  value={formData.toBankId} 
                  onValueChange={(value) => handleSelectChange('toBankId', value)}
                  disabled={!formData.toAppUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.toAppUserId ? "Select destination bank" : "Select app user first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getToBanks().map((bank) => (
                      <SelectItem key={bank._id} value={bank._id}>
                        {bank.bankName} - {bank.accountNumber}
                        <span className="text-sm text-gray-500 ml-2">
                          (Current: {formatCurrency(bank.balance)})
                        </span>
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
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
                {formData.fromBankId && formData.amount > 0 && (
                  <p className={`text-sm mt-1 ${
                    formData.amount > (getSelectedFromBank()?.balance || 0) 
                      ? 'text-red-500' 
                      : 'text-green-600'
                  }`}>
                    {formData.amount > (getSelectedFromBank()?.balance || 0) 
                      ? 'Insufficient balance' 
                      : 'Transfer amount is valid'
                    }
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter transfer description (optional)"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || formData.amount > (getSelectedFromBank()?.balance || 0)}
                >
                  {loading ? 'Processing...' : 'Transfer'}
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalTransferAmount)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTransfers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transfers found. Create your first transfer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From Bank</TableHead>
                  <TableHead>To Bank</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transfer.fromBankId.bankName}</div>
                        <div className="text-sm text-gray-500">{transfer.fromBankId.accountNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transfer.toBankId.bankName}</div>
                        <div className="text-sm text-gray-500">{transfer.toBankId.accountNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {formatCurrency(transfer.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {transfer.description || 'No description'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          transfer.status === 'COMPLETED' ? 'default' : 
                          transfer.status === 'PENDING' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(transfer.transferDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default BankTransfers;