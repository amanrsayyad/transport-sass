"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductsManager } from "./ProductsManager";
import { Customer } from "@/lib/redux/slices/customerSlice";

interface CustomerDetailsProps {
  customer: Customer;
  onClose: () => void;
}

export function CustomerDetails({ customer, onClose }: CustomerDetailsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Customer Details</span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Customer Name</h3>
                <p className="text-base">{customer.customerName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                <p className="text-base">{customer.companyName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Mobile Number</h3>
                <p className="text-base">{customer.mobileNo}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">GSTIN</h3>
                <p className="text-base">{customer.gstin || "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p className="text-base whitespace-pre-line">{customer.address || "-"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Products</h3>
                <p className="text-base">
                  <Badge>{customer.products?.length || 0} products</Badge>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                <p className="text-base">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Updated At</h3>
                <p className="text-base">
                  {new Date(customer.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products and Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsManager products={customer.products || []} readOnly={true} onChange={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}