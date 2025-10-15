"use client";

import { useState, ReactNode, useEffect } from "react";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "number" | "date" | "textarea" | "info";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  value?: string | number; // For info fields to display dynamic values
}

interface FormDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  schema: z.ZodObject<any>;
  fields: FormFieldConfig[];
  defaultValues: Record<string, any>;
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  mode?: "create" | "edit";
  initialData?: Record<string, any>;
  onFieldChange?: (fieldName: string, value: any, currentValues: Record<string, any>) => void;
}

export function FormDialog({
  trigger,
  title,
  description,
  schema,
  fields,
  defaultValues,
  onSubmit,
  submitLabel = "Create",
  isLoading = false,
  mode = "create",
  initialData,
  onFieldChange,
}: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: mode === "edit" && initialData ? initialData : defaultValues,
  });

  // Reset form when dialog opens or mode changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        form.reset(initialData);
      } else if (mode === "create") {
        form.reset(defaultValues);
      }
    }
  }, [initialData, mode, open, form, defaultValues]);

  // Update form values when defaultValues change while dialog is open
  useEffect(() => {
    if (open && mode === "create") {
      const currentValues = form.getValues();
      const updatedValues = { ...currentValues };
      
      // Only update fields that have changed in defaultValues and are not already filled by user
      Object.keys(defaultValues).forEach(key => {
        if (defaultValues[key] !== currentValues[key]) {
          // For vehicleId and startKm, always update to maintain sync
          if (key === 'vehicleId' || key === 'startKm') {
            updatedValues[key] = defaultValues[key];
          }
          // For other fields, only update if current value is empty/default
          else if (!currentValues[key] || currentValues[key] === '' || currentValues[key] === 0) {
            updatedValues[key] = defaultValues[key];
          }
        }
      });
      
      form.reset(updatedValues);
    }
  }, [defaultValues, open, mode, form]);

  const handleSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setError("");
      await onSubmit(data);
      setOpen(false);
      // Always reset to defaultValues after successful submission
      form.reset(defaultValues);
    } catch (error: any) {
      setError(error.message || "An error occurred");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset to defaultValues when closing dialog
      form.reset(defaultValues);
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form
            key={JSON.stringify(fields.map(f => f.options?.length || 0))}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                field.type === "info" ? (
                  <div
                    key={field.name}
                    className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-md"
                  >
                    <div className="text-sm font-medium text-blue-800 mb-1">
                      {field.label}
                    </div>
                    <div className="text-sm text-blue-600">
                      {field.value || "No information available"}
                    </div>
                  </div>
                ) : (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: formField }) => (
                      <FormItem
                        className={
                          field.type === "select" && field.name === "status"
                            ? "md:col-span-2"
                            : ""
                        }
                      >
                        <FormLabel>{field.label}</FormLabel>
                        <FormControl>
                        {field.type === "select" ? (
                          <Select
                            onValueChange={(value) => {
                              formField.onChange(value);
                              if (onFieldChange) {
                                onFieldChange(field.name, value, form.getValues());
                              }
                            }}
                            value={formField.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            placeholder={field.placeholder}
                            {...formField}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            {...formField}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const value =
                                field.type === "number"
                                  ? Number(e.target.value)
                                  : e.target.value;
                              formField.onChange(value);
                            }}
                          />
                        )}
                      </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? mode === "edit"
                    ? "Updating..."
                    : "Creating..."
                  : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
