'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar, Download, FileText, Table } from 'lucide-react';
import { toast } from 'sonner';

interface FilterState {
  fromDate: string;
  toDate: string;
  userId: string;
  bankId: string;
  modules: string[];
  format: 'pdf' | 'excel';
}

interface User {
  _id: string;
  name: string;
}

interface Bank {
  _id: string;
  bankName: string;
  isActive: boolean;
  appUserId: {
    _id: string;
  };
}

const AVAILABLE_MODULES = [
  { id: 'income', label: 'Income', description: 'Revenue and income records' },
  { id: 'expenses', label: 'Expenses', description: 'Expense transactions' },
  { id: 'driver-budgets', label: 'Driver Budgets', description: 'Driver budget allocations' },
  { id: 'transactions', label: 'Transactions', description: 'All transaction history' },
  { id: 'bank-transfers', label: 'Bank Transfers', description: 'Inter-bank transfers' },
  { id: 'invoices', label: 'Invoices', description: 'Customer invoices' },
  { id: 'fuel-tracking', label: 'Fuel Tracking', description: 'Fuel consumption records' },
  { id: 'trips', label: 'Trips', description: 'Trip details and expenses' },
  { id: 'attendance', label: 'Driver Attendance', description: 'Driver attendance records' },
  { id: 'maintenance', label: 'Maintenance', description: 'Vehicle maintenance records' },
  { id: 'vehicles', label: 'Vehicles', description: 'Vehicle information' },
  { id: 'drivers', label: 'Drivers', description: 'Driver information' }
];

export default function ReportsPage() {
  const [filters, setFilters] = useState<FilterState>({
    fromDate: '',
    toDate: '',
    userId: '',
    bankId: '',
    modules: [],
    format: 'pdf'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchBanks();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/app-users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks');
      if (response.ok) {
        const data = await response.json();
        setBanks(data);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const handleModuleToggle = (moduleId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      modules: checked 
        ? [...prev.modules, moduleId]
        : prev.modules.filter(id => id !== moduleId)
    }));
  };

  const selectAllModules = () => {
    setFilters(prev => ({
      ...prev,
      modules: AVAILABLE_MODULES.map(m => m.id)
    }));
  };

  const clearAllModules = () => {
    setFilters(prev => ({
      ...prev,
      modules: []
    }));
  };

  // Filter banks based on selected user
  const getFilteredBanks = () => {
    if (!filters.userId || filters.userId === 'all') {
      return banks.filter(bank => bank.isActive);
    }
    return banks.filter(bank => bank.isActive && bank.appUserId._id === filters.userId);
  };

  const handleDownload = async () => {
    if (filters.modules.length === 0) {
      toast.error('Please select at least one module to download');
      return;
    }

    if (!filters.fromDate || !filters.toDate) {
      toast.error('Please select both from and to dates');
      return;
    }

    setDownloading(true);
    try {
      const queryParams = new URLSearchParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        modules: filters.modules.join(','),
        format: filters.format,
        ...(filters.userId && filters.userId !== 'all' && { userId: filters.userId }),
        ...(filters.bankId && filters.bankId !== 'all' && { bankId: filters.bankId })
      });

      const response = await fetch(`/api/reports/download?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const filename = `transport-report-${filters.fromDate}-to-${filters.toDate}.${filters.format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Report downloaded successfully as ${filters.format.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      userId: '',
      bankId: '',
      modules: [],
      format: 'pdf'
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Download Reports
            </h1>
            <p className="text-muted-foreground">
              Generate comprehensive reports for chartered accountant analysis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date Range Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date Range
                </CardTitle>
                <CardDescription>
                  Select the date range for your report
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        fromDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={filters.toDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        toDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Filters</CardTitle>
                <CardDescription>
                  Optional filters to narrow down your report
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Filter by User</Label>
                  <Select
                    value={filters.userId}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        userId: value,
                        bankId: "all",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankId">Filter by Bank</Label>
                  <Select
                    value={filters.bankId}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, bankId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Banks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Banks</SelectItem>
                      {getFilteredBanks().map((bank) => (
                        <SelectItem key={bank._id} value={bank._id}>
                          {bank.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Module Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Modules</CardTitle>
                <CardDescription>
                  Choose which data modules to include in your report
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllModules}
                  >
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAllModules}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_MODULES.map((module) => (
                    <div key={module.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={module.id}
                        checked={filters.modules.includes(module.id)}
                        onCheckedChange={(checked) =>
                          handleModuleToggle(module.id, checked as boolean)
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={module.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {module.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Download Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Download Options</CardTitle>
                <CardDescription>
                  Choose your preferred format and download
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={filters.format}
                    onValueChange={(value: "pdf" | "excel") =>
                      setFilters((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          PDF Report
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          Excel Spreadsheet
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleDownload}
                    disabled={downloading || filters.modules.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading
                      ? "Generating..."
                      : `Download ${filters.format.toUpperCase()}`}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full"
                  >
                    Reset Filters
                  </Button>
                </div>

                {filters.modules.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Selected Modules:</p>
                    <ul className="list-disc list-inside mt-1">
                      {filters.modules.map((moduleId) => {
                        const module = AVAILABLE_MODULES.find(
                          (m) => m.id === moduleId
                        );
                        return <li key={moduleId}>{module?.label}</li>;
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Info */}
            <Card>
              <CardHeader>
                <CardTitle>Report Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  • Reports are structured for chartered accountant analysis
                </p>
                <p>• PDF format includes detailed summaries and charts</p>
                <p>• Excel format provides raw data for further analysis</p>
                <p>• All financial data includes payment type categorization</p>
                <p>• Date filters apply to transaction/creation dates</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}