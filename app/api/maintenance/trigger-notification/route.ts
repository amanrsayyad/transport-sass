import { NextRequest, NextResponse } from 'next/server';
import connectDB from "@/lib/mongodb";
import Maintenance from '@/models/Maintenance';
import Vehicle from '@/models/Vehicle';

// POST - Trigger maintenance notification when KM difference matches target
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { vehicleId, startKm, endKm, targetKm, category, categoryAmount, appUserId, bankId } = body;
    
    // Validate required fields
    if (!vehicleId || !startKm || !endKm || !targetKm || !category || !categoryAmount || !appUserId || !bankId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Calculate the difference
    const kmDifference = endKm - startKm;
    
    // Check if the difference matches or exceeds the target
    if (kmDifference >= targetKm) {
      // Get vehicle details
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }
      
      // Check if a similar notification already exists for this vehicle and category
      const existingNotification = await Maintenance.findOne({
        vehicleId,
        category,
        status: { $in: ['Due', 'Overdue'] },
        isCompleted: false,
        totalKm: { $gte: targetKm } // Already reached target
      });
      
      if (existingNotification) {
        return NextResponse.json({
          message: 'Notification already exists for this maintenance',
          notificationId: existingNotification._id
        });
      }
      
      // Create new maintenance notification record
      const maintenanceNotification = new Maintenance({
        appUserId,
        bankId,
        vehicleId,
        category,
        categoryAmount,
        targetKm,
        startKm,
        endKm,
        totalKm: kmDifference,
        status: kmDifference >= targetKm ? 'Due' : 'Pending',
        isCompleted: false,
        isNotificationSent: true, // Mark as notification sent
        createdBy: appUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await maintenanceNotification.save();
      
      // Populate the saved record for response
      await maintenanceNotification.populate([
        { path: 'appUserId', select: 'name' },
        { path: 'vehicleId', select: 'registrationNumber vehicleNumber vehicleType' },
        { path: 'bankId', select: 'bankName balance' }
      ]);
      
      return NextResponse.json({
        message: 'Maintenance notification triggered successfully',
        notification: maintenanceNotification,
        kmDifference,
        targetKm,
        vehicleNumber: vehicle.registrationNumber || vehicle.vehicleNumber
      });
    } else {
      return NextResponse.json({
        message: 'Target KM not yet reached',
        kmDifference,
        targetKm,
        remaining: targetKm - kmDifference
      });
    }
    
  } catch (error) {
    console.error('Error triggering maintenance notification:', error);
    return NextResponse.json(
      { error: 'Failed to trigger maintenance notification' },
      { status: 500 }
    );
  }
}