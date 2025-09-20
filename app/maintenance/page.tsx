"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchMaintenanceRecords,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  clearError,
  Maintenance,
} from "@/lib/redux/slices/maintenanceSlice";
import { fetchAppUsers } from "@/lib/redux/slices/appUserSlice";
import { fetchVehicles } from "@/lib/redux/slices/vehicleSlice";
import { fetchBanks } from "@/lib/redux/slices/bankSlice";
import { fetchMechanics } from "@/lib/redux/slices/mechanicSlice";
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MaintenanceForm } from "./components/MaintenanceForm";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { DownloadButton } from "@/components/common/DownloadButton";

export default function MaintenancePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { maintenanceRecords, loading, error } = useSelector(
    (state: RootState) => state.maintenance
  );
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { mechanics } = useSelector((state: RootState) => state.mechanics);

  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);

  // Helper function to get banks filtered by app user
  const getUserBanks = (userId: string) => {
    return banks.filter(bank => bank.isActive && bank.appUserId._id === userId);
  };

  const getActiveBanks = () => {
    return banks.filter(bank => bank.isActive);
  };

  useEffect(() => {
    dispatch(fetchMaintenanceRecords());
    dispatch(fetchAppUsers());
    dispatch(fetchMechanics());
    dispatch(fetchVehicles());
    dispatch(fetchBanks());
  }, [dispatch]);

  // Get user from Redux state
  const { user } = useSelector((state: RootState) => state.auth);

  const handleCreateMaintenance = async (maintenanceData: any) => {
    try {
      console.log("Maintenance data received from form:", maintenanceData);
      
      // Ensure all required fields are present
      if (!maintenanceData.appUserId || !maintenanceData.bankId || !maintenanceData.vehicleId) {
        console.error("Missing required fields:", { 
          appUserId: maintenanceData.appUserId, 
          bankId: maintenanceData.bankId, 
          vehicleId: maintenanceData.vehicleId 
        });
        toast.error("Missing required fields. Please fill all required fields.");
        return;
      }
      
      // Ensure createdBy is set
      if (!maintenanceData.createdBy) {
        maintenanceData.createdBy = user?.id || maintenanceData.appUserId;
        console.log("Setting createdBy to:", maintenanceData.createdBy);
      }
      
      const result = await dispatch(createMaintenanceRecord(maintenanceData)).unwrap();
      console.log("Maintenance record created successfully:", result);
      toast.success("Maintenance record created successfully");
      setShowForm(false);
      dispatch(fetchMaintenanceRecords());
      
      // Return the created maintenance record for monitoring
      return result;
    } catch (error: any) {
      console.error("Failed to create maintenance record:", error);
      toast.error(error?.message || "Failed to create maintenance record");
      // Show detailed error in console
      if (error?.stack) {
        console.error("Error stack:", error.stack);
      }
      throw error; // Re-throw to allow form to handle the error
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this maintenance record?")) {
      try {
        await dispatch(deleteMaintenanceRecord(id)).unwrap();
        toast.success("Maintenance record deleted successfully");
      } catch (error: any) {
        console.error("Failed to delete maintenance record:", error);
        toast.error(error?.message || "Failed to delete maintenance record");
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Due':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'Overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Due':
        return 'bg-red-100 text-red-800';
      case 'Overdue':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch(clearError())}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Management</h1>
          <p className="text-muted-foreground">
            Manage vehicle maintenance schedules and track service records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton module="maintenance" data={maintenanceRecords} />
          <Dialog open={showForm} onOpenChange={(open) => {
            if (!open) {
              setEditingMaintenance(null);
            }
            setShowForm(open);
          }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Maintenance Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaintenance ? "Edit Maintenance Record" : "Create New Maintenance Record"}
              </DialogTitle>
            </DialogHeader>
            <MaintenanceForm
              appUsers={appUsers}
              vehicles={vehicles}
              banks={banks}
              mechanics={mechanics}
              getUserBanks={getUserBanks}
              getActiveBanks={getActiveBanks}
              onSubmit={handleCreateMaintenance}
              onCancel={() => {
                setShowForm(false);
                setEditingMaintenance(null);
              }}
              initialData={editingMaintenance}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>



      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : maintenanceRecords.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance records found</h3>
              <p className="text-gray-500 text-center mb-4">
                Get started by creating your first maintenance record.
              </p>
              <Dialog open={showForm} onOpenChange={(open) => {
                if (!open) {
                  setEditingMaintenance(null);
                }
                setShowForm(open);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Maintenance Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMaintenance ? "Edit Maintenance Record" : "Create New Maintenance Record"}
                    </DialogTitle>
                  </DialogHeader>
                  <MaintenanceForm
                    appUsers={appUsers}
                    vehicles={vehicles}
                    banks={banks}
                    mechanics={mechanics}
                    getUserBanks={getUserBanks}
                    getActiveBanks={getActiveBanks}
                    onSubmit={handleCreateMaintenance}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingMaintenance(null);
                    }}
                    initialData={editingMaintenance}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          maintenanceRecords.map((maintenance) => (
            <Card key={maintenance._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(maintenance.status)}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {maintenance.vehicleNumber} - {maintenance.category}
                      </h3>
                      <p className="text-sm text-gray-600">
                        App User: {maintenance.appUserId?.name} | Bank: {maintenance.bankName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(maintenance.status)}>
                      {maintenance.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingMaintenance(maintenance);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMaintenance(maintenance._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount</p>
                    <p className="text-lg font-semibold">₹{maintenance.categoryAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Start KM</p>
                    <p className="text-lg font-semibold">{maintenance.startKm.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Target KM</p>
                    <p className="text-lg font-semibold">{maintenance.targetKm.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current KM</p>
                    <p className="text-lg font-semibold">{maintenance.endKm.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{maintenance.totalKm} / {maintenance.targetKm} KM</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        maintenance.totalKm >= maintenance.targetKm
                          ? 'bg-red-500'
                          : maintenance.totalKm >= maintenance.targetKm * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min((maintenance.totalKm / maintenance.targetKm) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}      </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}