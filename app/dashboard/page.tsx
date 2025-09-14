"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, Truck, UserCheck, TrendingUp, Building2, DollarSign, Receipt, Fuel, Wrench, AlertTriangle, FileText } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { RootState, AppDispatch } from "@/lib/redux/store";
import { fetchAppUsers } from "@/lib/redux/slices/appUserSlice";
import { fetchVehicles } from "@/lib/redux/slices/vehicleSlice";
import { fetchDrivers } from "@/lib/redux/slices/driverSlice";
import { fetchBanks } from "@/lib/redux/slices/bankSlice";
import { fetchTransactions } from "@/lib/redux/slices/transactionSlice";
import { fetchMaintenanceRecords } from "@/lib/redux/slices/maintenanceSlice";

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  const { drivers } = useSelector((state: RootState) => state.drivers);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { transactions } = useSelector((state: RootState) => state.transactions);
  const { maintenanceRecords } = useSelector((state: RootState) => state.maintenance);

  useEffect(() => {
    dispatch(fetchAppUsers());
    dispatch(fetchVehicles());
    dispatch(fetchDrivers());
    dispatch(fetchBanks());
    dispatch(fetchTransactions({ page: 1, limit: 100 }));
    dispatch(fetchMaintenanceRecords());
  }, [dispatch]);

  // Calculate statistics
  const activeAppUsers = appUsers.filter(
    (user) => user.status === "active"
  ).length;
  const availableVehicles = vehicles.filter(
    (vehicle) => vehicle.vehicleStatus === "available"
  ).length;
  const activeDrivers = drivers.filter(
    (driver) => driver.status === "active"
  ).length;

  // Finance statistics
  const activeBanks = banks.filter(bank => bank.isActive).length;
  const totalBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);
  const totalTransactions = transactions.length;
  const recentTransactions = transactions.slice(0, 5);

  // Maintenance statistics
  const totalMaintenance = maintenanceRecords.length;
  const dueMaintenance = maintenanceRecords.filter(m => m.status === 'Due' || m.status === 'Overdue').length;
  const completedMaintenance = maintenanceRecords.filter(m => m.status === 'Completed').length;
  const pendingMaintenance = maintenanceRecords.filter(m => m.status === 'Pending').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your transport management system
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">App Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{appUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeAppUsers} active users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Vehicles
                </CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vehicles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {availableVehicles} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Drivers</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{drivers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeDrivers} active drivers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Fleet Utilization
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {vehicles.length > 0
                    ? Math.round(
                        ((vehicles.length - availableVehicles) /
                          vehicles.length) *
                          100
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  {vehicles.length - availableVehicles} vehicles in use
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Overview */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Maintenance Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Maintenance</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalMaintenance}</div>
                  <p className="text-xs text-muted-foreground">
                    All maintenance records
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Due/Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{dueMaintenance}</div>
                  <p className="text-xs text-muted-foreground">
                    Requires immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <Wrench className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{completedMaintenance}</div>
                  <p className="text-xs text-muted-foreground">
                    Successfully completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <a href="/maintenance" className="text-sm text-blue-600 hover:underline block">
                      View All Maintenance
                    </a>
                    <a href="/maintenance" className="text-sm text-blue-600 hover:underline block">
                      Add New Record
                    </a>
                    <a href="/vehicles" className="text-sm text-blue-600 hover:underline block">
                      Vehicle Status
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Finance Overview */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Finance Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Banks</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeBanks}</div>
                  <p className="text-xs text-muted-foreground">
                    {banks.length} total banks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all bank accounts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Total financial activities
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <a href="/finance/banks" className="text-sm text-blue-600 hover:underline block">
                      Manage Banks
                    </a>
                    <a href="/finance/transfers" className="text-sm text-blue-600 hover:underline block">
                      Transfer Funds
                    </a>
                    <a href="/finance/income-expense" className="text-sm text-blue-600 hover:underline block">
                      Income & Expenses
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reports Overview */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Reports & Analytics</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Download Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">PDF/Excel</div>
                  <p className="text-xs text-muted-foreground">
                    Generate comprehensive reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Modules</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">10+</div>
                  <p className="text-xs text-muted-foreground">
                    Available data modules
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Filter Options</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Advanced</div>
                  <p className="text-xs text-muted-foreground">
                    Date, user, bank filtering
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <a href="/reports" className="text-sm text-blue-600 hover:underline block">
                      Generate Reports
                    </a>
                    <a href="/reports" className="text-sm text-blue-600 hover:underline block">
                      Download Data
                    </a>
                    <a href="/reports" className="text-sm text-blue-600 hover:underline block">
                      View Analytics
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Latest Financial Activities</CardTitle>
                  <CardDescription>
                    Your most recent financial transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransactions.map((transaction, index) => (
                      <div
                        key={transaction._id || index}
                        className="flex items-center justify-between border-b pb-2"
                      >
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.fromBankId?.bankName || transaction.toBankId?.bankName || 'N/A'} • {transaction.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${
                              transaction.type === "INCOME"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {transaction.type === "INCOME" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
