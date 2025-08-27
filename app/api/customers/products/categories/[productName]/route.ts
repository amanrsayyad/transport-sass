import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productName: string }> }
) {
  try {
    await connectDB();
    
    const { productName } = await params;
    const decodedProductName = decodeURIComponent(productName);
    
    // Find all customers that have a product with the given name
    const customers = await Customer.find({
      "products.productName": decodedProductName
    });

    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { error: "No products found with the given name" },
        { status: 404 }
      );
    }

    // Extract categories from all matching products
    let allCategories: string[] = [];
    for (const customer of customers) {
      const product = customer.products.find(
        (p: any) => p.productName === decodedProductName
      );
      if (product && product.categories) {
        allCategories = [...allCategories, ...product.categories];
      }
    }

    return NextResponse.json(allCategories);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}