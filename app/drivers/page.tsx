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
  fetchDrivers,
  deleteDriver,
  createDriver,
  updateDriver,
} from "@/lib/redux/slices/driverSlice";

const driverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobileNo: z.string().min(10, "Mobile number must be at least 10 digits"),
  status: z.enum(["active", "inactive", "on-leave"]),
});

const driverFields = [
  {
    name: "name",
    label: "Driver Name",
    type: "text" as const,
    placeholder: "Enter driver name",
    required: true,
  },
  {
    name: "mobileNo",
    label: "Mobile Number",
    type: "text" as const,
    placeholder: "Enter mobile number",
    required: true,
  },
  {
    name: "status",
    label: "Status",
    type: "select" as const,
    placeholder: "Select status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "on-leave", label: "On Leave" },
    ],
    required: true,
  },
];

const defaultValues = {
  name: "",
  mobileNo: "",
  status: "active",
};

const statusColors = {
  active: "default",
  inactive: "secondary",
  "on-leave": "outline",
} as const;

export default function DriversPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { drivers, isLoading, error } = useSelector(
    (state: RootState) => state.drivers
  );

  useEffect(() => {
    dispatch(fetchDrivers());
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    await dispatch(createDriver(data)).unwrap();
  };

  const handleEdit = async (data: any, id: string) => {
    await dispatch(updateDriver({ id, data })).unwrap();
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteDriver(id)).unwrap();
    } catch (error) {
      console.error("Failed to delete driver:", error);
    }
  };

  if (isLoading && drivers.length === 0) {
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
              <h1 className="text-3xl font-bold">Drivers</h1>
              <p className="text-muted-foreground">
                Manage your driver personnel
              </p>
            </div>

            <div className="flex gap-2">
              <DownloadButton
                module="drivers"
                data={drivers}
              />
              <FormDialog
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Driver
                  </Button>
                }
                title="Create Driver"
                description="Add a new driver to your team"
                schema={driverSchema}
                fields={driverFields}
                defaultValues={defaultValues}
                onSubmit={handleCreate}
                submitLabel="Create Driver"
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
              <CardTitle>All Drivers ({drivers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver._id}>
                      <TableCell className="font-medium">
                        {driver.name}
                      </TableCell>
                      <TableCell>{driver.mobileNo}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[driver.status]}>
                          {driver.status.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(driver.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ViewDialog
                            trigger={
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            }
                            title={`View Driver: ${driver.name}`}
                            description="Driver details"
                            fields={[
                              { label: "Name", value: driver.name },
                              {
                                label: "Mobile Number",
                                value: driver.mobileNo,
                              },
                              {
                                label: "Status",
                                value: driver.status.replace("-", " "),
                                type: "badge",
                                badgeVariant: statusColors[driver.status],
                              },
                              {
                                label: "Created At",
                                value: driver.createdAt,
                                type: "date",
                              },
                              {
                                label: "Updated At",
                                value: driver.updatedAt,
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
                            title={`Edit Driver: ${driver.name}`}
                            description="Update driver information"
                            schema={driverSchema}
                            fields={driverFields}
                            defaultValues={defaultValues}
                            initialData={{
                              name: driver.name,
                              mobileNo: driver.mobileNo,
                              status: driver.status,
                            }}
                            onSubmit={(data) => handleEdit(data, driver._id)}
                            submitLabel="Update Driver"
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
                                  permanently delete the driver "{driver.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(driver._id)}
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

              {drivers.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No drivers found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get started by adding your first driver
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
