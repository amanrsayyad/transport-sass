"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useMaintenanceMonitor } from "@/components/MaintenanceMonitor";

const maintenanceSchema = z.object({
  appUserId: z.string().min(1, "App User is required"),
  bankId: z.string().min(1, "Bank is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  category: z.string().min(1, "Category is required"),
  categoryAmount: z.number().min(1, "Amount must be greater than 0"),
  targetKm: z.number().min(1, "Target KM must be greater than 0"),
  startKm: z.number().min(0, "Start KM must be 0 or greater"),
  endKm: z.number().min(0, "End KM must be 0 or greater"),
  createdBy: z.string().min(1, "Created by is required"),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormProps {
  appUsers: any[];
  vehicles: any[];
  banks: any[];
  getUserBanks: (userId: string) => any[];
  getActiveBanks: () => any[];
  onSubmit: (data: any) => Promise<any>;
  onCancel: () => void;
  initialData?: any;
}

const maintenanceCategories = [
  "Engine Oil Change",
  "Brake Service",
  "Tire Replacement",
  "Battery Replacement",
  "Air Filter Change",
  "Transmission Service",
  "Coolant Service",
  "Spark Plug Replacement",
  "Belt Replacement",
  "General Inspection",
  "Other",
];

export function MaintenanceForm({
  appUsers,
  vehicles,
  banks,
  getUserBanks,
  getActiveBanks,
  onSubmit,
  onCancel,
  initialData,
}: MaintenanceFormProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { startMonitoringForMaintenance } = useMaintenanceMonitor();
  const [selectedAppUser, setSelectedAppUser] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [filteredBanks, setFilteredBanks] = useState(banks);
  const [startKm, setStartKm] = useState(0);
  const [endKm, setEndKm] = useState(0);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: initialData || {
      appUserId: '',
      bankId: '',
      vehicleId: '',
      category: '',
      categoryAmount: 0,
      targetKm: 500,
      startKm: 0,
      endKm: 0,
      createdBy: user?.id || '', // Set default createdBy
    },
  });

  const targetKm = watch("targetKm");

  // Set createdBy when user changes
  useEffect(() => {
    if (user?.id) {
      setValue('createdBy', user.id);
    }
  }, [user, setValue]);

  // Filter banks based on selected app user
  useEffect(() => {
    if (selectedAppUser) {
      const userBanks = getUserBanks(selectedAppUser);
      setFilteredBanks(userBanks);
    } else {
      setFilteredBanks(getActiveBanks());
    }
  }, [selectedAppUser, banks, getUserBanks, getActiveBanks]);

  // Fetch start KM and set up real-time end KM tracking when vehicle is selected
  useEffect(() => {
    if (selectedVehicle) {
      fetchVehicleLatestKm(selectedVehicle);
      // Set up interval to continuously track end KM
      const interval = setInterval(() => {
        fetchVehicleLatestKm(selectedVehicle, true);
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [selectedVehicle]);

  // Check if maintenance is due and trigger notification
  useEffect(() => {
    if (startKm > 0 && endKm > 0 && targetKm > 0 && selectedVehicle && selectedAppUser) {
      const totalKmTraveled = endKm - startKm;
      if (totalKmTraveled >= targetKm) {
        triggerMaintenanceNotification(totalKmTraveled);
      }
    }
  }, [startKm, endKm, targetKm, selectedVehicle, selectedAppUser]);

  const triggerMaintenanceNotification = async (kmDifference: number) => {
    try {
      const formData = watch();
      
      // Only trigger if we have all required data
      if (!formData.category || !formData.categoryAmount || !formData.bankId) {
        return; // Don't trigger notification if form is incomplete
      }
      
      const response = await fetch('/api/maintenance/trigger-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: selectedVehicle,
          startKm,
          endKm,
          targetKm,
          category: formData.category,
          categoryAmount: formData.categoryAmount,
          appUserId: selectedAppUser,
          bankId: formData.bankId,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Maintenance notification triggered:', result);
        
        // Show success message to user
        if (result.notification) {
          alert(`🔔 Maintenance Alert!\n\nVehicle: ${result.vehicleNumber}\nCategory: ${formData.category}\nKM Traveled: ${kmDifference.toLocaleString()}\nTarget: ${targetKm.toLocaleString()}\n\nNotification has been created and will appear in the header.`);
        }
      } else {
        const error = await response.json();
        console.error('Failed to trigger notification:', error);
      }
    } catch (error) {
      console.error('Error triggering maintenance notification:', error);
    }
  };

  const fetchVehicleLatestKm = async (vehicleId: string, isEndKmUpdate = false) => {
    try {
      if (!isEndKmUpdate) setLoading(true);
      const response = await fetch(`/api/trips/latest/${vehicleId}`);
      if (response.ok) {
        const latestTrip = await response.json();
        const kmValue = latestTrip.endKm || 0;
        
        if (isEndKmUpdate) {
          setEndKm(kmValue);
          setValue("endKm", kmValue, { shouldValidate: true });
        } else {
          setStartKm(kmValue);
          setEndKm(kmValue);
          setValue("startKm", kmValue, { shouldValidate: true });
          setValue("endKm", kmValue, { shouldValidate: true });
        }
      }
    } catch (error) {
      console.error("Failed to fetch vehicle latest KM:", error);
    } finally {
      if (!isEndKmUpdate) setLoading(false);
    }
  };

  const handleAppUserChange = (value: string) => {
    setSelectedAppUser(value);
    setValue("appUserId", value, { shouldValidate: true });
    setValue("bankId", ""); // Reset bank selection
  };

  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
    setValue("vehicleId", value, { shouldValidate: true });
  };

  const onFormSubmit = async (data: MaintenanceFormData) => {
    console.log("=== FORM SUBMISSION STARTED ===");
    console.log("Form submitted with data:", data);
    console.log("Redux user state:", user);
    console.log("Start KM:", startKm, "End KM:", endKm);
    console.log("Form errors:", errors);
    console.log("Form is valid:", Object.keys(errors).length === 0);

    // Check if all required fields are present
    const requiredFields = ['appUserId', 'bankId', 'vehicleId', 'category', 'categoryAmount', 'targetKm', 'startKm', 'endKm', 'createdBy'];
    const missingFields = requiredFields.filter(field => !data[field as keyof MaintenanceFormData]);
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      alert(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      
      console.log("Form data before processing:", data);
      console.log("User from Redux:", user);
      console.log("Start KM:", startKm, "End KM:", endKm);
      
      // Ensure createdBy is set before validation
      if (!data.createdBy) {
        setValue('createdBy', user?.id || data.appUserId);
        data.createdBy = user?.id || data.appUserId;
      }
      
      const selectedAppUserData = appUsers.find(user => user._id === data.appUserId);
      const selectedVehicleData = vehicles.find(vehicle => vehicle._id === data.vehicleId);
      const selectedBankData = banks.find(bank => bank._id === data.bankId);

      const formattedData = {
        ...data,
        startKm: data.startKm,
        endKm: data.endKm,
        bankName: selectedBankData?.bankName || "",
        vehicleNumber: selectedVehicleData?.vehicleNumber || selectedVehicleData?.registrationNumber || "",
        createdBy: data.createdBy
      };
      
      console.log("Formatted data being sent:", formattedData);
      console.log("=== CALLING onSubmit FUNCTION ===");

      const result: any = await onSubmit(formattedData);
      console.log("=== onSubmit COMPLETED SUCCESSFULLY ===");
      
      // Start monitoring for the newly created maintenance record
      if (result && result._id) {
        try {
          console.log("🔄 Starting monitoring for maintenance record:", result._id);
          await startMonitoringForMaintenance(result._id);
          console.log("✅ Monitoring started successfully for maintenance:", result._id);
        } catch (monitoringError) {
          console.warn("⚠️ Failed to start monitoring, but maintenance record was created:", monitoringError);
          // Don't throw error here as the maintenance record was created successfully
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      // Show error to user
      alert(`Error creating maintenance record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log("=== FORM SUBMISSION ENDED ===");
    }
  };

  const totalKmTraveled = endKm - startKm;
  const progressPercentage = targetKm > 0 ? Math.min((totalKmTraveled / targetKm) * 100, 100) : 0;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Hidden fields for form validation */}
      <input type="hidden" {...register("appUserId")} />
      <input type="hidden" {...register("bankId")} />
      <input type="hidden" {...register("vehicleId")} />
      <input type="hidden" {...register("category")} />
      <input type="hidden" {...register("createdBy")} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App User Selection */}
        <div className="space-y-2">
          <Label htmlFor="appUserId">App User *</Label>
          <Select onValueChange={handleAppUserChange} value={selectedAppUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select App User" />
            </SelectTrigger>
            <SelectContent>
              {appUsers.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.appUserId && (
            <p className="text-sm text-red-600">{errors.appUserId.message}</p>
          )}
        </div>

        {/* Bank Selection */}
        <div className="space-y-2">
          <Label htmlFor="bankId">Bank *</Label>
          <Select
            onValueChange={(value) => {
              setValue("bankId", value, { shouldValidate: true });
            }}
            value={watch("bankId")}
            disabled={!selectedAppUser}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Bank" />
            </SelectTrigger>
            <SelectContent>
              {filteredBanks.map((bank) => (
                <SelectItem key={bank._id} value={bank._id}>
                  {bank.bankName} (Balance: ₹
                  {bank.balance?.toLocaleString() || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bankId && (
            <p className="text-sm text-red-600">{errors.bankId.message}</p>
          )}
        </div>

        {/* Vehicle Selection */}
        <div className="space-y-2">
          <Label htmlFor="vehicleId">Vehicle *</Label>
          <Select onValueChange={handleVehicleChange} value={selectedVehicle}>
            <SelectTrigger>
              <SelectValue placeholder="Select Vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle._id} value={vehicle._id}>
                  {vehicle.registrationNumber} ({vehicle.vehicleType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicleId && (
            <p className="text-sm text-red-600">{errors.vehicleId.message}</p>
          )}
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">Maintenance Category *</Label>
          <Select 
            onValueChange={(value) => {
              setValue("category", value, { shouldValidate: true });
            }}
            value={watch("category")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {maintenanceCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Category Amount */}
        <div className="space-y-2">
          <Label htmlFor="categoryAmount">Amount (₹) *</Label>
          <Input
            id="categoryAmount"
            type="number"
            step="0.01"
            {...register("categoryAmount", { valueAsNumber: true })}
            placeholder="Enter amount"
          />
          {errors.categoryAmount && (
            <p className="text-sm text-red-600">
              {errors.categoryAmount.message}
            </p>
          )}
        </div>

        {/* Target KM */}
        <div className="space-y-2">
          <Label htmlFor="targetKm">Target KM *</Label>
          <Input
            id="targetKm"
            type="number"
            {...register("targetKm", { valueAsNumber: true })}
            placeholder="Enter target kilometers"
          />
          {errors.targetKm && (
            <p className="text-sm text-red-600">{errors.targetKm.message}</p>
          )}
        </div>

        {/* Start KM */}
        <div className="space-y-2">
          <Label htmlFor="startKm">Start KM *</Label>
          <Input
            id="startKm"
            type="number"
            {...register("startKm", { valueAsNumber: true })}
            value={startKm}
            onChange={(e) => {
              const value = Number(e.target.value);
              setStartKm(value);
              setValue("startKm", value, { shouldValidate: true });
            }}
            placeholder="Start kilometers (auto-populated)"
            className="bg-gray-50"
            readOnly
          />
          {errors.startKm && (
            <p className="text-sm text-red-600">{errors.startKm.message}</p>
          )}
          <p className="text-xs text-gray-600">
            Auto-populated from latest trip record
          </p>
        </div>

        {/* End KM */}
        <div className="space-y-2">
          <Label htmlFor="endKm">End KM *</Label>
          <Input
            id="endKm"
            type="number"
            {...register("endKm", { valueAsNumber: true })}
            value={endKm}
            onChange={(e) => {
              const value = Number(e.target.value);
              setEndKm(value);
              setValue("endKm", value, { shouldValidate: true });
            }}
            placeholder="End kilometers"
          />
          {errors.endKm && (
            <p className="text-sm text-red-600">{errors.endKm.message}</p>
          )}
          <p className="text-xs text-gray-600">
            Current end KM (real-time tracking)
          </p>
        </div>
      </div>

      {/* KM Tracking Display */}
      {selectedVehicle && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start KM Display */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start KM</Label>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? "Loading..." : startKm.toLocaleString()} KM
                </p>
                <p className="text-xs text-gray-600">
                  From latest trip record (auto-populated)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* End KM Display */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current End KM</Label>
                <p className="text-2xl font-bold text-green-600">
                  {endKm.toLocaleString()} KM
                </p>
                <p className="text-xs text-gray-600">
                  Real-time tracking from latest trips
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Tracking */}
      {selectedVehicle && targetKm > 0 && (
        <Card
          className={`${
            totalKmTraveled >= targetKm
              ? "border-red-500 bg-red-50"
              : "border-gray-200"
          }`}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">
                  Maintenance Progress
                </Label>
                <span
                  className={`text-sm font-semibold ${
                    totalKmTraveled >= targetKm
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {totalKmTraveled.toLocaleString()} /{" "}
                  {targetKm.toLocaleString()} KM
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    totalKmTraveled >= targetKm
                      ? "bg-red-500"
                      : progressPercentage >= 80
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              {totalKmTraveled >= targetKm && (
                <div className="flex items-center space-x-2 text-red-600">
                  <span className="text-sm font-medium">
                    ⚠️ Maintenance Due!
                  </span>
                  <span className="text-xs">
                    Exceeded target by{" "}
                    {(totalKmTraveled - targetKm).toLocaleString()} KM
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
        >
          {loading ? "Creating..." : (initialData ? "Update" : "Create")} Maintenance Record
        </Button>
      </div>
    </form>
  );
}