"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchMechanics,
  createMechanic,
  updateMechanic,
  deleteMechanic,
  clearError,
  Mechanic,
} from "@/lib/redux/slices/mechanicSlice";
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
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormDialog } from "@/components/common/FormDialog";
import { ViewDialog } from "@/components/common/ViewDialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";


// Zod schema for validation
const mechanicSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  status: z.enum(["active", "inactive"]),
  certifications: z.array(z.string()).optional(),
});

// Form fields configuration
const mechanicFields = [
  {
    name: "name",
    label: "Name",
    type: "text" as const,
    placeholder: "Enter mechanic name",
    required: true,
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "text" as const,
    placeholder: "Enter phone number",
    required: true,
  },
  {
    name: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    required: true,
  },
];

const defaultValues = {
  name: "",
  phone: "",
  status: "active" as const,
  certifications: [],
};

export default function MechanicsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { mechanics, isLoading, error } = useSelector(
    (state: RootState) => state.mechanics
  );



  useEffect(() => {
    dispatch(fetchMechanics());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleCreate = async (data: any) => {
    try {
      await dispatch(createMechanic(data)).unwrap();
      toast.success("Mechanic created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create mechanic");
    }
  };

  const handleEdit = async (data: any, id: string) => {
    try {
      await dispatch(
        updateMechanic({ id, data })
      ).unwrap();
      toast.success("Mechanic updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update mechanic");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteMechanic(id)).unwrap();
      toast.success("Mechanic deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete mechanic");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mechanics</h1>
        <FormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Mechanic
            </Button>
          }
          title="Add New Mechanic"
          description="Create a new mechanic record"
          schema={mechanicSchema}
          fields={mechanicFields}
          defaultValues={defaultValues}
          onSubmit={handleCreate}
          submitLabel="Create Mechanic"
          isLoading={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Mechanics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mechanics.map((mechanic) => (
                <TableRow key={mechanic._id}>
                  <TableCell className="font-medium">{mechanic.name}</TableCell>
                  <TableCell>{mechanic.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={mechanic.status === "active" ? "default" : "secondary"}
                    >
                      {mechanic.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <ViewDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                        title={`View Mechanic: ${mechanic.name}`}
                        description="Mechanic details"
                        fields={[
                          { label: "Name", value: mechanic.name },
                          { label: "Phone", value: mechanic.phone },
                          {
                            label: "Status",
                            value: mechanic.status,
                            type: "badge",
                            badgeVariant: mechanic.status === "active" ? "default" : "secondary",
                          },
                          {
                            label: "Created At",
                            value: mechanic.createdAt,
                            type: "date",
                          },
                          {
                            label: "Updated At",
                            value: mechanic.updatedAt,
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
                        title={`Edit Mechanic: ${mechanic.name}`}
                        description="Update mechanic information"
                        schema={mechanicSchema}
                        fields={mechanicFields}
                        defaultValues={defaultValues}
                        mode="edit"
                        initialData={{
                          name: mechanic.name,
                          phone: mechanic.phone,
                          status: mechanic.status,
                        }}
                        onSubmit={(data) => handleEdit(data, mechanic._id)}
                        submitLabel="Update Mechanic"
                        isLoading={isLoading}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently
                              delete the mechanic record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(mechanic._id)}
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
        </CardContent>
      </Card>




    </div>
    </DashboardLayout>
  );
}