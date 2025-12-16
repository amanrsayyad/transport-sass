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

import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchAppUsers,
  deleteAppUser,
  createAppUser,
  updateAppUser,
} from "@/lib/redux/slices/appUserSlice";

const appUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobileNo: z.string().min(10, "Mobile number must be at least 10 digits"),
  gstin: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

const appUserFields = [
  {
    name: "name",
    label: "Name",
    type: "text" as const,
    placeholder: "Enter full name",
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
    name: "gstin",
    label: "GSTIN",
    type: "text" as const,
    placeholder: "Enter GSTIN (optional)",
    required: false,
  },
  {
    name: "address",
    label: "Address",
    type: "text" as const,
    placeholder: "Enter address (optional)",
    required: false,
  },
  {
    name: "status",
    label: "Status",
    type: "select" as const,
    placeholder: "Select status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    required: true,
  },
];

const defaultValues = {
  name: "",
  mobileNo: "",
  gstin: "",
  address: "",
  status: "active",
};

export default function AppUsersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { appUsers, isLoading, error } = useSelector(
    (state: RootState) => state.appUsers
  );

  useEffect(() => {
    dispatch(fetchAppUsers());
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    await dispatch(createAppUser(data)).unwrap();
  };

  const handleEdit = async (data: any, id: string) => {
    await dispatch(updateAppUser({ id, data })).unwrap();
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteAppUser(id)).unwrap();
    } catch (error) {
      console.error("Failed to delete app user:", error);
    }
  };

  if (isLoading && appUsers.length === 0) {
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
              <h1 className="text-3xl font-bold">App Users</h1>
              <p className="text-muted-foreground">
                Manage your application users
              </p>
            </div>

            <FormDialog
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add App User
                </Button>
              }
              title="Create App User"
              description="Add a new app user to the system"
              schema={appUserSchema}
              fields={appUserFields}
              defaultValues={defaultValues}
              onSubmit={handleCreate}
              submitLabel="Create App User"
              isLoading={isLoading}
              mode="create"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All App Users ({appUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile No</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appUsers.map((appUser) => (
                    <TableRow key={appUser._id}>
                      <TableCell className="font-medium">
                        {appUser.name}
                      </TableCell>
                      <TableCell>{appUser.mobileNo}</TableCell>
                      <TableCell>{appUser.gstin || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            appUser.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {appUser.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(appUser.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ViewDialog
                            trigger={
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            }
                            title={`View App User: ${appUser.name}`}
                            description="App user details"
                            fields={[
                              { label: "Name", value: appUser.name },
                              {
                                label: "Mobile Number",
                                value: appUser.mobileNo,
                              },
                              {
                                label: "GSTIN",
                                value: appUser.gstin || "—",
                              },
                              {
                                label: "Address",
                                value: appUser.address || "—",
                              },
                              {
                                label: "Status",
                                value: appUser.status,
                                type: "badge",
                                badgeVariant:
                                  appUser.status === "active"
                                    ? "default"
                                    : "secondary",
                              },
                              {
                                label: "Created At",
                                value: appUser.createdAt,
                                type: "date",
                              },
                              {
                                label: "Updated At",
                                value: appUser.updatedAt,
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
                            title={`Edit App User: ${appUser.name}`}
                            description="Update app user information"
                            schema={appUserSchema}
                            fields={appUserFields}
                            defaultValues={defaultValues}
                            initialData={{
                              name: appUser.name,
                              mobileNo: appUser.mobileNo,
                              gstin: appUser.gstin || "",
                              address: appUser.address || "",
                              status: appUser.status,
                            }}
                            onSubmit={(data) => handleEdit(data, appUser._id)}
                            submitLabel="Update App User"
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
                                  permanently delete the app user "
                                  {appUser.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(appUser._id)}
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

              {appUsers.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No app users found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get started by creating your first app user
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
