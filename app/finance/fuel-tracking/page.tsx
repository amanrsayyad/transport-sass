"use client";

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as z from "zod";
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchFuelTrackings,
  createFuelTracking,
  updateFuelTracking,
  deleteFuelTracking,
  clearError,
  FuelTrackingCreateData,
  FuelTracking
} from '@/lib/redux/slices/operationsSlice';
import { fetchBanks } from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { fetchVehicles } from '@/lib/redux/slices/vehicleSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Fuel, TrendingUp, Calendar, DollarSign, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DownloadButton } from '@/components/common/DownloadButton';
import { FormDialog } from '@/components/common/FormDialog';
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

// Zod schema for fuel tracking validation
const fuelTrackingSchema = z.object({
  appUserId: z.string().min(1, "App user is required"),
  bankId: z.string().min(1, "Bank account is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  startKm: z.number().min(0, "Start KM must be positive"),
  endKm: z.number().min(0, "End KM must be positive"),
  fuelQuantity: z.number().min(0.1, "Fuel quantity must be greater than 0"),
  fuelRate: z.number().min(0.1, "Fuel rate must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  paymentType: z.string().min(1, "Payment type is required"),
});

// Field configuration for FormDialog
const fuelTrackingFields = [
  {
    name: "appUserId",
    label: "App User",
    type: "select" as const,
    placeholder: "Select app user",
    required: true,
  },
  {
    name: "bankId",
    label: "Bank Account",
    type: "select" as const,
    placeholder: "Select bank account",
    required: true,
  },
  {
    name: "vehicleId",
    label: "Vehicle",
    type: "select" as const,
    placeholder: "Select vehicle",
    required: true,
  },
  {
    name: "startKm",
    label: "Start KM",
    type: "number" as const,
    placeholder: "Enter start KM",
    required: true,
  },
  {
    name: "endKm",
    label: "End KM",
    type: "number" as const,
    placeholder: "Enter end KM",
    required: true,
  },
  {
    name: "fuelQuantity",
    label: "Fuel Quantity (L)",
    type: "number" as const,
    placeholder: "Enter fuel quantity",
    required: true,
  },
  {
    name: "fuelRate",
    label: "Fuel Rate (per L)",
    type: "number" as const,
    placeholder: "Enter fuel rate",
    required: true,
  },
  {
    name: "date",
    label: "Date",
    type: "date" as const,
    placeholder: "Select date",
    required: true,
  },
  {
    name: "paymentType",
    label: "Payment Type",
    type: "select" as const,
    placeholder: "Select payment type",
    options: [
      { value: "Cash", label: "Cash" },
      { value: "UPI", label: "UPI" },
      { value: "Net Banking", label: "Net Banking" },
      { value: "Credit Card", label: "Credit Card" },
      { value: "Debit Card", label: "Debit Card" },
      { value: "Cheque", label: "Cheque" },
    ],
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    placeholder: "Enter description (optional)",
    required: false,
  },
];

// Default values for the form
const defaultValues = {
  appUserId: "",
  bankId: "",
  vehicleId: "",
  startKm: 0,
  endKm: 0,
  fuelQuantity: 0,
  fuelRate: 0,
  date: new Date().toISOString().split('T')[0],
  description: "",
  paymentType: "",
};

// FuelTrackingFormData interface removed - FormDialog uses Zod schema types

const FuelTrackingManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { fuelTrackings, fuelTrackingsPagination, loading, error } = useSelector((state: RootState) => state.operations);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  
  // State for dynamic field management
  const [selectedAppUserId, setSelectedAppUserId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [dynamicStartKm, setDynamicStartKm] = useState<number>(0);
  const [previousRemainingFuel, setPreviousRemainingFuel] = useState<number>(0);
  
  // State for editing functionality
  const [editingRecord, setEditingRecord] = useState<FuelTracking | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // FormDialog will handle its own state management

  // Payment types array
  const paymentTypes = ['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card', 'Cheque'];

  useEffect(() => {
    dispatch(fetchFuelTrackings({ page: fuelTrackingsPagination.page, limit: fuelTrackingsPagination.limit }));
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
    dispatch(fetchVehicles());
  }, [dispatch, fuelTrackingsPagination.page, fuelTrackingsPagination.limit]);

  const handlePageChange = (page: number) => {
    dispatch(fetchFuelTrackings({ page, limit: fuelTrackingsPagination.limit }));
  };

  // Handle field changes for dynamic updates
  const handleFieldChange = async (fieldName: string, value: any, currentValues: Record<string, any>) => {
    if (fieldName === 'appUserId') {
      setSelectedAppUserId(value);
      // Reset bankId when app user changes to force user to select a new bank
      // This will be handled by the form itself through field regeneration
    }
    
    if (fieldName === 'vehicleId') {
      setSelectedVehicleId(value);
      
      // Fetch latest trip record to get end km for start km
      try {
        const tripResponse = await fetch(`/api/trips/latest/${value}`);
        let startKm = 0;
        
        if (tripResponse.ok) {
          const latestTrip = await tripResponse.json();
          startKm = latestTrip.endKm || 0;
        }
        
        // Update dynamic start km state
        setDynamicStartKm(startKm);
        
        // Fetch latest fuel tracking record to get remaining fuel for carry-forward
        const fuelResponse = await fetch(`/api/fuel-tracking/latest/${value}`);
        let remainingFuel = 0;
        
        if (fuelResponse.ok) {
          const latestFuelRecord = await fuelResponse.json();
          remainingFuel = latestFuelRecord.remainingFuelQuantity || 0;
        }
        
        // Update previous remaining fuel state
        setPreviousRemainingFuel(remainingFuel);
        
        // Update the form field value directly through the form's setValue if available
        // The FormDialog will handle this through field regeneration
      } catch (error) {
        console.error('Error fetching latest trip or fuel record:', error);
        setDynamicStartKm(0);
        setPreviousRemainingFuel(0);
      }
    }
  };

  const handleLimitChange = (limit: number) => {
    dispatch(fetchFuelTrackings({ page: 1, limit }));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Old form handling functions removed - FormDialog handles form state internally

  // Handle create for FormDialog
  const handleCreate = async (data: any) => {
    // Validation
    if (data.endKm <= data.startKm) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    if (data.fuelQuantity <= 0 || data.fuelRate <= 0) {
      toast.error('Fuel quantity and rate must be greater than 0');
      return;
    }

    const totalAmount = data.fuelQuantity * data.fuelRate;
    const distance = data.endKm - data.startKm;
    const truckAverage = distance / data.fuelQuantity;
    const selectedBank = banks.find(bank => bank._id === data.bankId);
    
    if (selectedBank && totalAmount > selectedBank.balance) {
      toast.error('Insufficient bank balance for this fuel expense');
      return;
    }

    const fuelTrackingData: FuelTrackingCreateData = {
      appUserId: data.appUserId,
      bankId: data.bankId,
      vehicleId: data.vehicleId,
      startKm: data.startKm,
      endKm: data.endKm,
      fuelQuantity: data.fuelQuantity,
      fuelRate: data.fuelRate,
      totalAmount,
      truckAverage,
      date: data.date,
      description: data.description || '',
      paymentType: data.paymentType,
    };

    try {
      await dispatch(createFuelTracking(fuelTrackingData)).unwrap();
      toast.success('Fuel tracking record created successfully');
      // Refresh data
      dispatch(fetchFuelTrackings({ page: fuelTrackingsPagination.page, limit: fuelTrackingsPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to create fuel tracking record');
      throw error; // Re-throw to let FormDialog handle the error state
    }
  };

  // Handle edit for FormDialog
  const handleEdit = async (data: any, fuelRecord: FuelTracking) => {
    if (!fuelRecord) return;

    // Validation
    if (data.endKm <= data.startKm) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    if (data.fuelQuantity <= 0 || data.fuelRate <= 0) {
      toast.error('Fuel quantity and rate must be greater than 0');
      return;
    }

    const totalAmount = data.fuelQuantity * data.fuelRate;
    const distance = data.endKm - data.startKm;
    const truckAverage = distance / data.fuelQuantity;
    const selectedBank = banks.find(bank => bank._id === data.bankId);
    
    // Check bank balance (considering the original amount will be restored)
    const originalAmount = fuelRecord.totalAmount;
    const netAmountChange = totalAmount - originalAmount;
    
    if (selectedBank && netAmountChange > selectedBank.balance) {
      toast.error('Insufficient bank balance for this fuel expense update');
      return;
    }

    const updateData = {
      appUserId: data.appUserId,
      bankId: data.bankId,
      vehicleId: data.vehicleId,
      startKm: data.startKm,
      endKm: data.endKm,
      fuelQuantity: data.fuelQuantity,
      fuelRate: data.fuelRate,
      totalAmount,
      truckAverage,
      date: data.date,
      description: data.description || '',
      paymentType: data.paymentType,
    };

    try {
      await dispatch(updateFuelTracking({ id: fuelRecord._id, fuelData: updateData })).unwrap();
      toast.success('Fuel tracking record updated successfully');
      // Refresh data
      dispatch(fetchFuelTrackings({ page: fuelTrackingsPagination.page, limit: fuelTrackingsPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to update fuel tracking record');
      throw error; // Re-throw to let FormDialog handle the error state
    }
  };

  // Handle delete
  const handleDelete = async (record: FuelTracking) => {
    try {
      await dispatch(deleteFuelTracking(record._id)).unwrap();
      toast.success('Fuel tracking record deleted successfully');
      // Refresh data
      dispatch(fetchFuelTrackings({ page: fuelTrackingsPagination.page, limit: fuelTrackingsPagination.limit }));
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to delete fuel tracking record');
    }
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

  // Helper functions that referenced formData removed - FormDialog handles calculations internally

  // Generate dynamic default values
  const getDefaultValues = () => ({
    appUserId: selectedAppUserId || "",
    bankId: "",
    vehicleId: selectedVehicleId || "",
    startKm: selectedVehicleId ? dynamicStartKm : 0,
    endKm: 0,
    fuelQuantity: 0,
    fuelRate: 0,
    date: new Date().toISOString().split('T')[0],
    description: "",
    paymentType: "",
  });

  // Generate dynamic field configuration with options
  const getFuelTrackingFields = (selectedAppUserId?: string): any[] => {
    const baseFields: any[] = fuelTrackingFields.map(field => {
      if (field.name === 'appUserId') {
        return {
          ...field,
          options: appUsers.map(user => ({
            value: user._id,
            label: user.name
          }))
        };
      }
      if (field.name === 'bankId') {
        return {
          ...field,
          options: (selectedAppUserId ? getUserBanks(selectedAppUserId) : getActiveBanks()).map(bank => ({
            value: bank._id,
            label: `${bank.bankName} - ${bank.accountNumber} (${formatCurrency(bank.balance)})`
          }))
        };
      }
      if (field.name === 'vehicleId') {
        return {
          ...field,
          options: vehicles.map(vehicle => ({
            value: vehicle._id,
            label: `${vehicle.registrationNumber} (${vehicle.vehicleType} ${vehicle.vehicleWeight}kg)`
          }))
        };
      }
      if (field.name === 'startKm') {
        return {
          ...field,
          defaultValue: selectedVehicleId ? dynamicStartKm : 0,
          placeholder: selectedVehicleId && dynamicStartKm > 0 
            ? `Auto-filled from latest trip: ${dynamicStartKm} km` 
            : "Enter start KM"
        };
      }
      return field;
    });
  
    // Add carry-forward fuel information field if a vehicle is selected and has remaining fuel
    if (selectedVehicleId && previousRemainingFuel > 0) {
      // Insert the carry-forward info field after vehicleId (index 2) and before startKm
      const carryForwardField = {
        name: "carryForwardInfo",
        label: "Previous Remaining Fuel",
        type: "info" as const,
        value: `${previousRemainingFuel.toFixed(2)} L will be carried forward from the previous record`,
        required: false,
      } as const;
      
      baseFields.splice(3, 0, carryForwardField);
    }
  
    return baseFields;
  };

  const totalFuelExpense = fuelTrackings.reduce((sum, fuel) => sum + fuel.totalAmount, 0);
  const totalFuelQuantity = fuelTrackings.reduce((sum, fuel) => sum + fuel.fuelQuantity, 0);
  const uniqueVehicles = new Set(fuelTrackings.map(fuel => fuel.vehicleId._id)).size;
  const averageFuelRate = fuelTrackings.length > 0 
    ? fuelTrackings.reduce((sum, fuel) => sum + fuel.fuelRate, 0) / fuelTrackings.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Fuel Tracking Management</h1>
            <p className="text-gray-600">
              Track fuel expenses and vehiJcle efficiency
            </p>
          </div>

          <div className="flex gap-2">
            <DownloadButton module="fuel-tracking" data={fuelTrackings} />
            <FormDialog
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Fuel Record
                </Button>
              }
              title="Add Fuel Tracking Record"
              description="Create a new fuel tracking record"
              schema={fuelTrackingSchema}
              fields={getFuelTrackingFields(selectedAppUserId)}
              defaultValues={getDefaultValues()}
              onSubmit={handleCreate}
              onFieldChange={handleFieldChange}
              submitLabel="Add Record"
              isLoading={loading}
              mode="create"
            />

          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Records
              </CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fuelTrackings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Fuel Expense
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalFuelExpense)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Fuel (L)
              </CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalFuelQuantity.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Fuel Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(averageFuelRate)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fuel Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Tracking Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                Loading fuel tracking records...
              </div>
            ) : fuelTrackings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No fuel tracking records found. Add your first fuel record.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App User</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelTrackings.map((fuel) => (
                    <TableRow key={fuel._id}>
                      <TableCell>
                        <div className="font-medium">{fuel.appUserId.name}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {fuel.bankId.bankName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fuel.bankId.accountNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {fuel.vehicleId.registrationNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fuel.vehicleId.vehicleType}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {(fuel.endKm - fuel.startKm).toFixed(1)} km
                          </div>
                          <div className="text-sm text-gray-500">
                            {fuel.startKm} → {fuel.endKm}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {fuel.fuelQuantity.toFixed(2)} L
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(fuel.fuelRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">
                          {formatCurrency(fuel.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {fuel.truckAverage.toFixed(2)} km/L
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(fuel.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <FormDialog
                            trigger={
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                            title="Edit Fuel Tracking Record"
                            description="Update the fuel tracking record"
                            schema={fuelTrackingSchema}
                            fields={getFuelTrackingFields(fuel.appUserId._id)}
                            defaultValues={{
                              appUserId: fuel.appUserId._id,
                              bankId: fuel.bankId._id,
                              vehicleId: fuel.vehicleId._id,
                              startKm: fuel.startKm,
                              endKm: fuel.endKm,
                              fuelQuantity: fuel.fuelQuantity,
                              fuelRate: fuel.fuelRate,
                              date: fuel.date.split('T')[0],
                              description: fuel.description || '',
                              paymentType: fuel.paymentType,
                            }}
                            onSubmit={(data) => handleEdit(data, fuel)}
                            onFieldChange={handleFieldChange}
                            submitLabel="Update Record"
                            isLoading={loading}
                            mode="edit"
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the fuel tracking record
                                  and restore the bank balance.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(fuel)}>
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
            )}
            {fuelTrackings.length > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={fuelTrackingsPagination.page}
                  totalPages={fuelTrackingsPagination.pages}
                  onPageChange={handlePageChange}
                  itemsPerPage={fuelTrackingsPagination.limit}
                  onItemsPerPageChange={handleLimitChange}
                  totalItems={fuelTrackingsPagination.total}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FuelTrackingManagement;