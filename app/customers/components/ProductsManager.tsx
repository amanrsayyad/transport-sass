"use client";

import { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import * as z from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Product, Category } from "@/lib/redux/slices/customerSlice";

// Schema for category validation
const categorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  categoryRate: z.number().min(0, "Rate must be a positive number"),
});

// Schema for product validation
const productSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productRate: z.number().min(0, "Rate must be a positive number"),
  categories: z.array(categorySchema),
});

interface ProductsManagerProps {
  products: Product[];
  onChange: (products: Product[]) => void;
  readOnly?: boolean;
}

export function ProductsManager({
  products = [],
  onChange,
  readOnly = false,
}: ProductsManagerProps) {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  
  // Form for adding/editing products
  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productName: "",
      productRate: 0,
      categories: [],
    },
  });

  // Form for managing categories within a product
  const categoryForm = useForm<{ categories: Category[] }>({
    resolver: zodResolver(z.object({
      categories: z.array(categorySchema),
    })),
    defaultValues: {
      categories: [],
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = 
    useFieldArray({
      control: categoryForm.control,
      name: "categories",
    });

  // Handle product form submission
  const onProductSubmit = (data: z.infer<typeof productSchema>) => {
    const newProducts = [...products];
    
    if (editingProductIndex !== null) {
      // Update existing product with all data including categories
      newProducts[editingProductIndex] = {
        ...newProducts[editingProductIndex],
        productName: data.productName,
        productRate: data.productRate,
        categories: data.categories,
      };
    } else {
      // Add new product
      newProducts.push(data);
    }
    
    onChange(newProducts);
    setIsAddProductOpen(false);
    setEditingProductIndex(null);
    productForm.reset({
      productName: "",
      productRate: 0,
      categories: [],
    });
  };

  // Handle category form submission
  const onCategorySubmit = (data: { categories: Category[] }) => {
    if (selectedProductIndex !== null) {
      const newProducts = [...products];
      newProducts[selectedProductIndex] = {
        ...newProducts[selectedProductIndex],
        categories: data.categories,
      };
      onChange(newProducts);
      setSelectedProductIndex(null);
      categoryForm.reset({ categories: [] });
    }
  };

  // Open product dialog for editing
  const handleEditProduct = (index: number) => {
    const product = products[index];
    productForm.reset({
      productName: product.productName,
      productRate: product.productRate,
      categories: product.categories || [],
    });
    setEditingProductIndex(index);
    setIsAddProductOpen(true);
  };

  // Delete a product
  const handleDeleteProduct = (index: number) => {
    const newProducts = [...products];
    newProducts.splice(index, 1);
    onChange(newProducts);
  };

  // Open category manager for a product
  const handleManageCategories = (index: number) => {
    // First clear any existing form state
    categoryForm.reset({ categories: [] });
    
    const product = products[index];
    setSelectedProductIndex(index);
    
    // Use setTimeout to ensure the form is properly reset before setting new values
    setTimeout(() => {
      categoryForm.reset({
        categories: product.categories || [],
      });
    }, 0);
    
    // If in readOnly mode and there are no categories, add an empty one to show the form structure
    if (readOnly && (!product.categories || product.categories.length === 0) && appendCategory) {
      setTimeout(() => {
        appendCategory({
          categoryName: "",
          categoryRate: 0,
        });
      }, 10);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Manage products for this customer
            </CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={isAddProductOpen} onOpenChange={(open) => {
              if (!open) {
                setEditingProductIndex(null);
                productForm.reset();
              }
              setIsAddProductOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingProductIndex !== null ? "Edit Product" : "Add Product"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProductIndex !== null
                      ? "Update product details"
                      : "Add a new product for this customer"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...productForm}>
                  <form
                    onSubmit={productForm.handleSubmit(onProductSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={productForm.control}
                      name="productName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter product name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={productForm.control}
                      name="productRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Rate</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter product rate"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        onClick={() => {
                          setIsAddProductOpen(false);
                          setEditingProductIndex(null);
                          productForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingProductIndex !== null ? "Update" : "Add"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Categories</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {product.productName}
                    </TableCell>
                    <TableCell>{product.productRate}</TableCell>
                    <TableCell>
                      <Dialog
                        open={selectedProductIndex === index}
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedProductIndex(null);
                          } else {
                            handleManageCategories(index);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto" disabled={readOnly && (product.categories?.length || 0) === 0}>
                            {product.categories?.length || 0} categories
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Categories for {product.productName}
                            </DialogTitle>
                            <DialogDescription>
                              Manage categories for this product
                            </DialogDescription>
                          </DialogHeader>

                          <Form {...categoryForm}>
                            <form
                              onSubmit={categoryForm.handleSubmit(onCategorySubmit)}
                              className="space-y-4"
                            >
                              {categoryFields.map((field, index) => (
                                <div
                                  key={field.id}
                                  className="flex items-end gap-2"
                                >
                                  <FormField
                                    control={categoryForm.control}
                                    name={`categories.${index}.categoryName`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel>
                                          {index === 0 && "Category Name"}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter category name"
                                            {...field}
                                            disabled={readOnly}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={categoryForm.control}
                                    name={`categories.${index}.categoryRate`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel>
                                          {index === 0 && "Category Rate"}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                          type="number"
                                          placeholder="Enter rate"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          disabled={readOnly}
                                        />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {!readOnly && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeCategory(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}

                              {!readOnly && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() =>
                                    appendCategory({
                                      categoryName: "",
                                      categoryRate: 0,
                                    })
                                  }
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Category
                                </Button>
                              )}

                              <div className="flex justify-end space-x-2 pt-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProductIndex(null);
                                    categoryForm.reset({ categories: [] });
                                  }}
                                >
                                  {readOnly ? "Close" : "Cancel"}
                                </Button>
                                {!readOnly && (
                                  <Button type="submit">Save Categories</Button>
                                )}
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={readOnly ? 3 : 4}
                    className="text-center py-6"
                  >
                    <p className="text-muted-foreground">
                      No products added yet
                    </p>
                    {!readOnly && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Click the &quot;Add Product&quot; button to add your first
                        product
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}