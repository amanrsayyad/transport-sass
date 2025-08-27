"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductsManager } from "./ProductsManager";

import { Customer, Product } from "@/lib/redux/slices/customerSlice";

// Schema for customer validation
const categorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  categoryRate: z.coerce.number().min(0, "Rate must be a positive number"),
});

const productSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productRate: z.coerce.number().min(0, "Rate must be a positive number"),
  categories: z.array(categorySchema).optional().default([]),
});

const customerSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  mobileNo: z.string().min(10, "Mobile number must be at least 10 digits"),
  products: z.array(productSchema).optional().default([]),
});

interface CustomerDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  defaultValues?: Partial<Customer>;
  onSubmit: (data: Customer) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export function CustomerDialog({
  trigger,
  title,
  description,
  defaultValues = {
    customerName: "",
    companyName: "",
    mobileNo: "",
    products: [],
  },
  onSubmit,
  isLoading = false,
  mode,
}: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "products">("details");
  const [products, setProducts] = useState<Product[]>(defaultValues.products || []);

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues as any,
  });

  const handleSubmit = (data: z.infer<typeof customerSchema>) => {
    const customerData = {
      ...data,
      products,
    };
    onSubmit(customerData as Customer);
    setOpen(false);
    setStep("details");
    form.reset();
  };

  const handleProductsChange = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
  };

  const handleNext = () => {
    form.trigger(["customerName", "companyName", "mobileNo"]).then((isValid) => {
      if (isValid) {
        setStep("products");
      }
    });
  };

  const handleBack = () => {
    setStep("details");
  };

  const handleCancel = () => {
    setOpen(false);
    setStep("details");
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter customer name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter company name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobileNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter mobile number"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  Next: Products
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <ProductsManager
              products={products}
              onChange={handleProductsChange}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading}
              >
                {mode === "create" ? "Create Customer" : "Update Customer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}