import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { customerId, productName, categories } = body || {};

    if (!customerId || !productName || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: "customerId, productName and categories are required" },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const product = customer.products.find((p: any) => p.productName === productName);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found for this customer" },
        { status: 404 }
      );
    }

    for (const cat of categories) {
      const name = (cat?.categoryName || "").trim();
      const rate = Number(cat?.categoryRate ?? 0);
      if (!name) continue;
      if (Number.isNaN(rate) || rate < 0) continue;

      const existing = product.categories.find((c: any) => c.categoryName === name);
      if (existing) {
        existing.categoryRate = rate;
      } else {
        product.categories.push({ categoryName: name, categoryRate: rate });
      }
    }

    await customer.save();

    const updatedProduct = customer.products.find((p: any) => p.productName === productName);
    const updatedCategories = updatedProduct?.categories || [];
    return NextResponse.json(updatedCategories, { status: 201 });
  } catch (error) {
    console.error("Error adding categories:", error);
    return NextResponse.json({ error: "Failed to add categories" }, { status: 500 });
  }
}