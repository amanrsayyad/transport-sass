import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Maintenance from "@/models/Maintenance";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const maintenanceId = params.id;

    // Find the maintenance record
    const maintenance = await Maintenance.findById(maintenanceId)
      .populate('appUserId')
      .populate('vehicleId');

    if (!maintenance) {
      return NextResponse.json(
        { message: "Maintenance record not found" },
        { status: 404 }
      );
    }

    // Check if maintenance is already completed
    if (maintenance.status === 'Completed') {
      return NextResponse.json(
        { message: "Maintenance is already completed" },
        { status: 400 }
      );
    }

    // Update maintenance record to mark as declined
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      maintenanceId,
      {
        status: 'Pending', // Reset to pending status
        notificationStatus: 'Declined',
        declinedAt: new Date(),
        isNotificationSent: false // Allow future notifications
      },
      { new: true }
    ).populate('appUserId').populate('vehicleId');

    return NextResponse.json({
      message: "Maintenance notification declined successfully",
      data: {
        maintenance: updatedMaintenance
      }
    });

  } catch (error) {
    console.error("Error declining maintenance:", error);
    return NextResponse.json(
      { message: "Failed to decline maintenance", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}