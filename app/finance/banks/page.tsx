"use client";

import React, { useEffect } from 'react';
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
import { DownloadButton } from '@/components/common/DownloadButton';
import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, DollarSign, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import * as z from "zod";

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

const bankSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  balance: z.number().min(0, "Balance must be positive"),
  appUserId: z.string().min(1, "App user is required"),
});

const defaultValues = {
  bankName: "",
  accountNumber: "",
  balance: 0,
  appUserId: "",
};

const BankManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { banks, loading, error } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);

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

  // Create bank fields configuration
  const bankFields = [
    {
      name: "bankName",
      label: "Bank Name",
      type: "text" as const,
      placeholder: "Enter bank name",
      required: true,
    },
    {
      name: "accountNumber",
      label: "Account Number",
      type: "text" as const,
      placeholder: "Enter account number",
      required: true,
    },
    {
      name: "balance",
      label: "Initial Balance",
      type: "number" as const,
      placeholder: "0.00",
      required: false,
    },
    {
      name: "appUserId",
      label: "App User",
      type: "select" as const,
      placeholder: "Select app user",
      options: appUsers.map((user) => ({
        value: user._id,
        label: user.name,
      })),
      required: true,
    },
  ];

  const handleCreate = async (data: any) => {
    try {
      const createData: BankCreateData = { ...data };
      await dispatch(createBank(createData)).unwrap();
      toast.success('Bank created successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to create bank');
      throw error;
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
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
        
        <div className="flex space-x-2">
          <DownloadButton module="banks" data={banks} />
          <FormDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Bank
              </Button>
            }
            title="Add New Bank"
            description="Enter bank details to add a new bank account."
            schema={bankSchema}
            fields={bankFields}
            defaultValues={defaultValues}
            onSubmit={handleCreate}
            submitLabel="Create Bank"
            isLoading={loading}
            mode="create"
          />
        </div>
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