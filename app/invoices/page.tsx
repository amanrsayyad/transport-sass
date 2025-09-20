"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  clearError as clearInvoiceError,
  InvoiceCreateData,
  InvoiceRow,
} from "@/lib/redux/slices/invoiceSlice";
import {
  fetchCustomers,
  Customer,
  Product,
  clearError as clearCustomerError,
} from "@/lib/redux/slices/customerSlice";
import { fetchVehicles } from "@/lib/redux/slices/vehicleSlice";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Pagination from "@/components/common/Pagination";
import { InvoicePDF } from "@/components/invoices/InvoicePDF";
import { generateInvoicePDF } from "@/lib/utils/pdfGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, FileText, Download, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { DownloadButton } from "@/components/common/DownloadButton";

interface InvoiceFormData extends InvoiceCreateData {
  id?: string;
}

const InvoicesPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { invoices, loading, error, pagination } = useSelector(
    (state: RootState) => state.invoices
  );
  const { customers } = useSelector((state: RootState) => state.customers);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerProducts, setCustomerProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState({
    status: "all",
    customerName: "all",
    lrNo: "",
  });

  const [formData, setFormData] = useState<InvoiceFormData>({
    date: new Date().toISOString().split("T")[0],
    from: "",
    to: "",
    taluka: "",
    dist: "",
    customerName: "",
    consignor: "",
    consignee: "",
    lrNo: "",
    remarks: "",
    status: "Unpaid",
    rows: [
      {
        product: "",
        truckNo: "",
        articles: "",
        weight: 0,
        rate: 0,
        total: 0,
        remarks: "",
      },
    ],
  });

  useEffect(() => {
    dispatch(fetchInvoices({ page: pagination.page, limit: pagination.limit }));
    dispatch(fetchCustomers());
    dispatch(fetchVehicles());
  }, [dispatch, pagination.page, pagination.limit]);

  const handlePageChange = (page: number) => {
    dispatch(fetchInvoices({ page, limit: pagination.limit }));
  };

  const handleLimitChange = (limit: number) => {
    dispatch(fetchInvoices({ page: 1, limit }));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearInvoiceError());
    }
  }, [error, dispatch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // When customer is selected, fetch their products
    if (name === "customerName") {
      console.log("Customer selected:", value);
      const customer = customers.find((c) => c.companyName === value);
      console.log("Found customer:", customer);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerProducts(customer.products || []);
        console.log("Set customer products:", customer.products || []);
      } else {
        setSelectedCustomer(null);
        setCustomerProducts([]);
      }
    }
  };

  const handleProductSelect = (index: number, productName: string) => {
    console.log("Product selected:", productName);
    console.log("Available products:", customerProducts);
    const product = customerProducts.find((p) => p.productName === productName);
    console.log("Found product:", product);
    if (product) {
      handleRowChange(index, "product", productName);
      handleRowChange(index, "rate", product.productRate);
    }
  };

  const handleRowChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updatedRows = [...formData.rows];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    };

    // Auto-calculate total for the row
    if (field === "weight" || field === "rate") {
      const weight =
        field === "weight" ? Number(value) : updatedRows[index].weight || 0;
      const rate =
        field === "rate" ? Number(value) : updatedRows[index].rate || 0;
      updatedRows[index].total = weight * rate;
    }

    setFormData((prev) => ({
      ...prev,
      rows: updatedRows,
    }));
  };

  const addRow = () => {
    setFormData((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        {
          product: "",
          truckNo: "",
          articles: "",
          weight: 0,
          rate: 0,
          total: 0,
          remarks: "",
        },
      ],
    }));
  };

  const removeRow = (index: number) => {
    if (formData.rows.length > 1) {
      setFormData((prev) => ({
        ...prev,
        rows: prev.rows.filter((_, i) => i !== index),
      }));
    }
  };

  const generateLRNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const lrNo = `LR${dateStr}${randomNum}`;
    setFormData((prev) => ({ ...prev, lrNo }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.date ||
      !formData.from ||
      !formData.to ||
      !formData.customerName
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.rows.length === 0) {
      toast.error("At least one row is required");
      return;
    }

    for (const row of formData.rows) {
      if (!row.product || !row.truckNo) {
        toast.error("Product and truck number are required for each row");
        return;
      }
    }

    try {
      if (editingInvoice) {
        await dispatch(
          updateInvoice({
            id: editingInvoice._id,
            invoiceData: formData,
          })
        ).unwrap();
        toast.success("Invoice updated successfully");
      } else {
        await dispatch(createInvoice(formData)).unwrap();
        toast.success("Invoice created successfully");
      }

      handleSheetClose();
      dispatch(fetchInvoices({ page: pagination.page, limit: pagination.limit }));
    } catch (error: any) {
      toast.error(error.message || "Failed to save invoice");
    }
  };

  const handleEdit = (invoice: any) => {
    setEditingInvoice(invoice);
    setFormData({
      ...invoice,
      date: invoice.date.split("T")[0],
    });

    // Set selected customer and products when editing
    const customer = customers.find(
      (c) => c.companyName === invoice.customerName
    );
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerProducts(customer.products || []);
    }

    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await dispatch(deleteInvoice(id)).unwrap();
        toast.success("Invoice deleted successfully");
      } catch (error: any) {
        toast.error(error.message || "Failed to delete invoice");
      }
    }
  };

  const handlePreview = (invoice: any) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleDownloadPDF = async () => {
    if (previewInvoice) {
      toast.info("Preparing PDF for download...");
      try {
        // Get the invoice element
        const invoiceElement = document.getElementById("invoice-pdf");
        if (!invoiceElement) {
          throw new Error("Invoice element not found. Please try again.");
        }
        
        // Generate a filename based on invoice details
        const lrNo = previewInvoice.lrNo || 'INV';
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${lrNo}_${dateStr}`;
        
        // Generate and download the PDF
        await generateInvoicePDF(invoiceElement, filename);
        toast.success("PDF downloaded successfully");
      } catch (error: any) {
        console.error("PDF generation error:", error);
        
        // Provide more user-friendly error messages
        if (error.message && error.message.includes("unsupported color function")) {
          toast.error("PDF generation failed due to color formatting issues. Our team has been notified.");
        } else if (error.message && error.message.includes("Tainted canvases")) {
          toast.error("PDF generation failed due to security restrictions. Please ensure all content is from the same domain.");
        } else if (error.message && error.message.includes("Maximum call stack")) {
          toast.error("PDF generation failed due to complexity. Please try again with a simpler invoice.");
        } else {
          toast.error(error.message || "Failed to generate PDF. Please try again later.");
        }
      }
    } else {
      toast.error("No invoice selected for download");
    }
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setEditingInvoice(null);
    setSelectedCustomer(null);
    setCustomerProducts([]);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      from: "",
      to: "",
      taluka: "",
      dist: "",
      customerName: "",
      consignor: "",
      consignee: "",
      lrNo: "",
      remarks: "",
      status: "Unpaid",
      rows: [
        {
          product: "",
          truckNo: "",
          articles: "",
          weight: 0,
          rate: 0,
          total: 0,
          remarks: "",
        },
      ],
    });
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    dispatch(fetchInvoices({ ...filters, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "default";
      case "Pending":
        return "secondary";
      case "Unpaid":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const totalInvoiceAmount = invoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0
  );
  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "Paid"
  ).length;
  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status === "Unpaid"
  ).length;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-gray-600">Manage your transport invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton module="invoices" data={invoices} filters={filters} />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button onClick={() => {
              setEditingInvoice(null);
              setSelectedCustomer(null);
              setCustomerProducts([]);
              setFormData({
                date: new Date().toISOString().split("T")[0],
                from: "",
                to: "",
                taluka: "",
                dist: "",
                customerName: "",
                consignor: "",
                consignee: "",
                lrNo: "",
                remarks: "",
                status: "Unpaid",
                rows: [
                  {
                    product: "",
                    truckNo: "",
                    articles: "",
                    weight: 0,
                    rate: 0,
                    total: 0,
                    remarks: "",
                  },
                ],
              });
              setIsSheetOpen(true);
            }}>
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85%] overflow-y-auto p-6">
            <SheetHeader>
              <SheetTitle>
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="from">From *</Label>
                  <Input
                    id="from"
                    name="from"
                    value={formData.from}
                    onChange={handleInputChange}
                    placeholder="Origin location"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="to">To *</Label>
                  <Input
                    id="to"
                    name="to"
                    value={formData.to}
                    onChange={handleInputChange}
                    placeholder="Destination location"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taluka">Taluka</Label>
                  <Input
                    id="taluka"
                    name="taluka"
                    value={formData.taluka}
                    onChange={handleInputChange}
                    placeholder="Taluka"
                  />
                </div>
                <div>
                  <Label htmlFor="dist">District</Label>
                  <Input
                    id="dist"
                    name="dist"
                    value={formData.dist}
                    onChange={handleInputChange}
                    placeholder="District"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Select
                    value={formData.customerName}
                    onValueChange={(value) =>
                      handleSelectChange("customerName", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem
                          key={customer._id}
                          value={customer.companyName}
                        >
                          {customer.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleSelectChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consignor">Consignor</Label>
                  <Input
                    id="consignor"
                    name="consignor"
                    value={formData.consignor}
                    onChange={handleInputChange}
                    placeholder="Consignor name"
                  />
                </div>
                <div>
                  <Label htmlFor="consignee">Consignee</Label>
                  <Input
                    id="consignee"
                    name="consignee"
                    value={formData.consignee}
                    onChange={handleInputChange}
                    placeholder="Consignee name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lrNo">LR Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="lrNo"
                      name="lrNo"
                      value={formData.lrNo}
                      onChange={handleInputChange}
                      placeholder="LR Number"
                    />
                    <Button
                      type="button"
                      onClick={generateLRNumber}
                      variant="outline"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Additional remarks"
                  />
                </div>
              </div>

              {/* Invoice Rows */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg font-semibold">Invoice Items</Label>
                  <Button
                    type="button"
                    onClick={addRow}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product *</TableHead>
                        <TableHead>Truck No *</TableHead>
                        <TableHead>Articles</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.rows.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={row.product}
                              onValueChange={(value) =>
                                handleProductSelect(index,  value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {customerProducts.map((product) => (
                                  <SelectItem
                                    key={product._id}
                                    value={product.productName}
                                  >
                                    {product.productName}
                                  </SelectItem>
                                ))}
                                {customerProducts.length === 0 && (
                                  <SelectItem value="no-products" disabled>
                                    {selectedCustomer
                                      ? "No products available"
                                      : "Select customer first"}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={row.truckNo}
                              onValueChange={(value) =>
                                handleRowChange(index, "truckNo", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                {vehicles.map((vehicle) => (
                                  <SelectItem
                                    key={vehicle._id}
                                    value={vehicle.registrationNumber}
                                  >
                                    {vehicle.registrationNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.articles}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  "articles",
                                  e.target.value
                                )
                              }
                              placeholder="Articles"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={row.weight}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  "weight",
                                  Number(e.target.value)
                                )
                              }
                              placeholder="Weight"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={row.rate?.toString() || ""}
                              onValueChange={(value) =>
                                handleRowChange(index, "rate", Number(value))
                              }>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rate" />
                              </SelectTrigger>
                              <SelectContent>
                                {customerProducts.map((product) => (
                                  <SelectItem
                                    key={product._id}
                                    value={product.productRate.toString()}
                                  >
                                    ₹{product.productRate}
                                  </SelectItem>
                                ))}
                                {customerProducts.length === 0 && (
                                  <SelectItem value="no-rate" disabled>
                                    {selectedCustomer
                                      ? "No rates available"
                                      : "Select customer first"}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={row.total}
                              readOnly
                              className="bg-gray-50"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.remarks}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  "remarks",
                                  e.target.value
                                )
                              }
                              placeholder="Remarks"
                            />
                          </TableCell>
                          <TableCell>
                            {formData.rows.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeRow(index)}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSheetClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "Saving..."
                    : editingInvoice
                    ? "Update Invoice"
                    : "Create Invoice"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalInvoiceAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidInvoices}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unpaid Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unpaidInvoices}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customerFilter">Customer</Label>
              <Select
                value={filters.customerName}
                onValueChange={(value) =>
                  handleFilterChange("customerName", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer._id} value={customer.companyName}>
                      {customer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lrNoFilter">LR Number</Label>
              <Input
                id="lrNoFilter"
                value={filters.lrNo}
                onChange={(e) => handleFilterChange("lrNo", e.target.value)}
                placeholder="Search by LR number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invoices found. Create your first invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LR No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>From - To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-medium">
                        {invoice.lrNo}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{invoice.from}</div>
                          <div className="text-gray-500">to {invoice.to}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(invoice.total)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(invoice._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {invoices.length > 0 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleLimitChange}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              Review your invoice before downloading
            </DialogDescription>
          </DialogHeader>
          {previewInvoice && (
            <div className="p-6 bg-white border rounded-lg">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-red-600">
                    RDS TRANSPORT
                  </h2>
                  <p className="text-sm">
                    (Transport Contractor, Commission Agent)
                  </p>
                  <p className="text-sm">
                    Near Bombay Restaurant, Gorakhpur-Pirwadi, NH-4, Satara.
                  </p>
                  <p className="text-sm">Email: rdsTransport5192@gmail.com</p>
                  <p className="text-sm">9604047861 / 9765000068</p>
                </div>
                <div className="text-right">
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(previewInvoice.date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>From:</strong> {previewInvoice.from}
                  </p>
                  <p>
                    <strong>To:</strong> {previewInvoice.to}
                  </p>
                  <p>
                    <strong>Taluka:</strong> {previewInvoice.taluka}
                  </p>
                  <p>
                    <strong>Dist.:</strong> {previewInvoice.dist}
                  </p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="mb-6">
                <p>
                  <strong>Company Name:</strong> {previewInvoice.customerName}
                </p>
                <p>
                  <strong>Consignor:</strong> {previewInvoice.consignor}
                </p>
                <p>
                  <strong>Consignee:</strong> {previewInvoice.consignee}
                </p>
                <p>
                  <strong>L.R. No.:</strong> {previewInvoice.lrNo}
                </p>
              </div>

              {/* Items Table */}
              <Table className="mb-6">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product said to Contain</TableHead>
                    <TableHead>Truck No.</TableHead>
                    <TableHead>No. of Articles</TableHead>
                    <TableHead>Weight/M.T.</TableHead>
                    <TableHead>Rate/PMT ₹</TableHead>
                    <TableHead>₹</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewInvoice.rows.map((row: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{row.product}</TableCell>
                      <TableCell>{row.truckNo}</TableCell>
                      <TableCell>{row.articles}</TableCell>
                      <TableCell>{row.weight} Kg</TableCell>
                      <TableCell>{row.rate}</TableCell>
                      <TableCell>₹{row.total}</TableCell>
                      <TableCell>{row.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Total */}
              <div className="mb-6">
                <p>
                  <strong>TOTAL: ₹ {previewInvoice.total}</strong>
                </p>
              </div>

              {/* Footer */}
              <div className="grid grid-cols-2 gap-8 mt-8">
                <div>
                  <p className="mb-4">
                    Receiver's Signature ____________________
                  </p>
                  <p className="mb-4">
                    Driver's Signature ____________________
                  </p>
                  <p className="mb-4">With Rubber Stamp</p>
                  <p>Received Goods in Good Condition</p>
                </div>
                <div className="text-right">
                  <p>Subject to Satara Jurisdiction</p>
                  <p className="mt-8">
                    <strong>FOR RDS TRANSPORT</strong>
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Hidden PDF component for generation */}
              <div
                style={{
                  position: "absolute",
                  left: "-9999px",
                  top: "-9999px",
                }}
              >
                <InvoicePDF invoice={previewInvoice} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InvoicesPage;
