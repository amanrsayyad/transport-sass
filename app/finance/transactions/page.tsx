"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchTransactions,
  setFilters,
  clearFilters,
  setPagination,
  clearError 
} from '@/lib/redux/slices/transactionSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DownloadButton } from '@/components/common/DownloadButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

const TransactionHistory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    transactions, 
    loading, 
    error, 
    pagination, 
    filters 
  } = useSelector((state: RootState) => state.transactions);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  
  const [localFilters, setLocalFilters] = useState({
    type: 'all',
    appUserId: 'all',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    dispatch(fetchTransactions({ page: 1, limit: 20 }));
    dispatch(fetchAppUsers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleFilterChange = (name: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const filterParams = {
      ...localFilters,
      page: 1,
      limit: pagination.limit,
    };
    
    // Remove empty filters and 'all' values
    Object.keys(filterParams).forEach(key => {
      const value = filterParams[key as keyof typeof filterParams];
      if (!value || value === 'all') {
        delete filterParams[key as keyof typeof filterParams];
      }
    });

    dispatch(setFilters(localFilters));
    dispatch(fetchTransactions(filterParams));
  };

  const clearAllFilters = () => {
    setLocalFilters({
      type: 'all',
      appUserId: 'all',
      startDate: '',
      endDate: '',
    });
    dispatch(clearFilters());
    dispatch(fetchTransactions({ page: 1, limit: pagination.limit }));
  };

  const handlePageChange = (newPage: number) => {
    const params = {
      ...filters,
      page: newPage,
      limit: pagination.limit,
    };
    dispatch(setPagination({ page: newPage }));
    dispatch(fetchTransactions(params));
  };

  const refreshTransactions = () => {
    const params = {
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
    };
    dispatch(fetchTransactions(params));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'EXPENSE':
      case 'FUEL':
      case 'DRIVER_BUDGET':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'bg-green-100 text-green-800';
      case 'EXPENSE':
        return 'bg-red-100 text-red-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      case 'FUEL':
        return 'bg-orange-100 text-orange-800';
      case 'DRIVER_BUDGET':
        return 'bg-purple-100 text-purple-800';
      case 'BANK_UPDATE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = transactions.reduce((sum, transaction) => {
    if (transaction.type === 'INCOME') {
      return sum + transaction.amount;
    } else if (['EXPENSE', 'FUEL', 'DRIVER_BUDGET'].includes(transaction.type)) {
      return sum - transaction.amount;
    }
    return sum;
  }, 0);

  const incomeCount = transactions.filter(t => t.type === 'INCOME').length;
  const expenseCount = transactions.filter(t => ['EXPENSE', 'FUEL', 'DRIVER_BUDGET'].includes(t.type)).length;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-gray-600">
            Complete record of all financial activities
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshTransactions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <DownloadButton module="transactions" data={transactions} filters={filters} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalAmount >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Income Transactions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {incomeCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expense Transactions
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {expenseCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="type">Transaction Type</Label>
              <Select
                value={localFilters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="FUEL">Fuel</SelectItem>
                  <SelectItem value="DRIVER_BUDGET">Driver Budget</SelectItem>
                  <SelectItem value="BANK_UPDATE">Bank Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="appUserId">App User</Label>
              <Select
                value={localFilters.appUserId}
                onValueChange={(value) =>
                  handleFilterChange("appUserId", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {appUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={localFilters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={localFilters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters}>
                <Search className="w-4 h-4 mr-2" />
                Apply
              </Button>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">App User</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                      <TableHead className="min-w-[200px]">
                        Description
                      </TableHead>
                      <TableHead className="min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[120px]">
                        Balance After
                      </TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction._id}>
                        <TableCell>
                          <div className="font-medium">
                            {transaction.appUserId.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTransactionIcon(transaction.type)}
                            <Badge
                              className={getTransactionTypeColor(
                                transaction.type
                              )}
                            >
                              {transaction.type.replace("_", " ")}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-xs truncate"
                            title={transaction.description}
                          >
                            {transaction.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              transaction.type === "INCOME"
                                ? "text-green-600"
                                : ["EXPENSE", "FUEL", "DRIVER_BUDGET"].includes(
                                    transaction.type
                                  )
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          >
                            {transaction.type === "INCOME"
                              ? "+"
                              : ["EXPENSE", "FUEL", "DRIVER_BUDGET"].includes(
                                  transaction.type
                                )
                              ? "-"
                              : ""}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(transaction.balanceAfter)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === "COMPLETED"
                                ? "default"
                                : transaction.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} transactions
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default TransactionHistory;