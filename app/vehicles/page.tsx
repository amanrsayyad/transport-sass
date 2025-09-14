"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import * as z from "zod";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { FormDialog } from "@/components/common/FormDialog";
import { ViewDialog } from "@/components/common/ViewDialog";
import { DownloadButton } from "@/components/common/DownloadButton";

import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchVehicles,
  deleteVehicle,
  createVehicle,
  updateVehicle,
} from "@/lib/redux/slices/vehicleSlice";

const vehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(3, "Registration number must be at least 3 characters"),
  vehicleType: z.enum(["truck", "van", "bus", "car", "motorcycle"]),
  vehicleWeight: z.number().min(0, "Weight must be positive"),
  vehicleStatus: z.enum(["available", "in-use", "maintenance", "retired"]),
});

const vehicleFields = [
  {
    name: "registrationNumber",
    label: "Registration Number",
    type: "text" as const,
    placeholder: "Enter registration number",
    required: true,
  },
  {
    name: "vehicleType",
    label: "Vehicle Type",
    type: "select" as const,
    placeholder: "Select vehicle type",
    options: [
      { value: "truck", label: "Truck" },
      { value: "van", label: "Van" },
      { value: "bus", label: "Bus" },
      { value: "car", label: "Car" },
      { value: "motorcycle", label: "Motorcycle" },
    ],
    required: true,
  },
  {
    name: "vehicleWeight",
    label: "Vehicle Weight (kg)",
    type: "number" as const,
    placeholder: "Enter vehicle weight",
    required: true,
  },
  {
    name: "vehicleStatus",
    label: "Status",
    type: "select" as const,
    placeholder: "Select status",
    options: [
      { value: "available", label: "Available" },
      { value: "in-use", label: "In Use" },
      { value: "maintenance", label: "Maintenance" },
      { value: "retired", label: "Retired" },
    ],
    required: true,
  },
];

const defaultValues = {
  registrationNumber: "",
  vehicleType: "truck",
  vehicleWeight: 0,
  vehicleStatus: "available",
};

const statusColors = {
  available: "default",
  "in-use": "secondary",
  maintenance: "destructive",
  retired: "outline",
} as const;

export default function VehiclesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { vehicles, isLoading, error } = useSelector(
    (state: RootState) => state.vehicles
  );

  useEffect(() => {
    dispatch(fetchVehicles());
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    await dispatch(createVehicle(data)).unwrap();
  };

  const handleEdit = async (data: any, id: string) => {
    await dispatch(updateVehicle({ id, data })).unwrap();
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteVehicle(id)).unwrap();
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
    }
  };

  if (isLoading && vehicles.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              <h1 className="text-3xl font-bold">Vehicles</h1>
              <p className="text-muted-foreground">
                Manage your fleet vehicles
              </p>
            </div>

            <div className="flex gap-2">
              <DownloadButton module="vehicles" data={vehicles} />
              <FormDialog
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Vehicle
                  </Button>
                }
                title="Create Vehicle"
                description="Add a new vehicle to your fleet"
                schema={vehicleSchema}
                fields={vehicleFields}
                defaultValues={defaultValues}
                onSubmit={handleCreate}
                submitLabel="Create Vehicle"
                isLoading={isLoading}
                mode="create"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Vehicles ({vehicles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle._id}>
                      <TableCell className="font-medium font-mono">
                        {vehicle.registrationNumber}
                      </TableCell>
                      <TableCell className="capitalize">
                        {vehicle.vehicleType}
                      </TableCell>
                      <TableCell>
                        {vehicle.vehicleWeight.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[vehicle.vehicleStatus]}>
                          {vehicle.vehicleStatus.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(vehicle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ViewDialog
                            trigger={
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            }
                            title={`View Vehicle: ${vehicle.registrationNumber}`}
                            description="Vehicle details"
                            fields={[
                              {
                                label: "Registration Number",
                                value: vehicle.registrationNumber,
                              },
                              {
                                label: "Vehicle Type",
                                value: vehicle.vehicleType,
                              },
                              {
                                label: "Weight (kg)",
                                value: vehicle.vehicleWeight.toLocaleString(),
                              },
                              {
                                label: "Status",
                                value: vehicle.vehicleStatus.replace("-", " "),
                                type: "badge",
                                badgeVariant:
                                  statusColors[vehicle.vehicleStatus],
                              },
                              {
                                label: "Created At",
                                value: vehicle.createdAt,
                                type: "date",
                              },
                              {
                                label: "Updated At",
                                value: vehicle.updatedAt,
                                type: "date",
                              },
                            ]}
                          />

                          <FormDialog
                            trigger={
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                            title={`Edit Vehicle: ${vehicle.registrationNumber}`}
                            description="Update vehicle information"
                            schema={vehicleSchema}
                            fields={vehicleFields}
                            defaultValues={defaultValues}
                            initialData={{
                              registrationNumber: vehicle.registrationNumber,
                              vehicleType: vehicle.vehicleType,
                              vehicleWeight: vehicle.vehicleWeight,
                              vehicleStatus: vehicle.vehicleStatus,
                            }}
                            onSubmit={(data) => handleEdit(data, vehicle._id)}
                            submitLabel="Update Vehicle"
                            isLoading={isLoading}
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
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the vehicle "
                                  {vehicle.registrationNumber}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(vehicle._id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={isLoading}
                                >
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

              {vehicles.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No vehicles found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get started by adding your first vehicle
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
