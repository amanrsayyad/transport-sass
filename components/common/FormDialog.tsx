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
  type: "text" | "select" | "number";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
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
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
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
                            onValueChange={formField.onChange}
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
