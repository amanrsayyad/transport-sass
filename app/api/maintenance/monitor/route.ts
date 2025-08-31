import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Maintenance from '@/models/Maintenance';
import Trip from '@/models/Trip';
import Vehicle from '@/models/Vehicle';

// POST - Start continuous monitoring for a maintenance record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { maintenanceId } = body;
    
    if (!maintenanceId) {
      return NextResponse.json(
        { error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }
    
    // Find the maintenance record
    const maintenance = await Maintenance.findById(maintenanceId);
    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    // Start monitoring by updating the record
    await Maintenance.findByIdAndUpdate(maintenanceId, {
      isMonitoring: true,
      monitoringStartedAt: new Date()
    });
    
    return NextResponse.json({
      message: 'Monitoring started successfully',
      maintenanceId
    });
  } catch (error) {
    console.error('Error starting maintenance monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to start monitoring' },
      { status: 500 }
    );
  }
}

// GET - Check and update maintenance records based on latest trip data
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Find all active maintenance records that need monitoring
    const activeMaintenanceRecords = await Maintenance.find({
      status: { $in: ['Pending', 'Due'] },
      isCompleted: false
    }).populate('vehicleId');
    
    const updatedRecords = [];
    
    for (const maintenance of activeMaintenanceRecords) {
      try {
        // Get the latest trip for this vehicle
        const latestTrip = await Trip.findOne({ 
          vehicleId: maintenance.vehicleId 
        }).sort({ createdAt: -1 });
        
        if (latestTrip) {
          const currentKm = latestTrip.endKm;
          const kmTraveled = currentKm - maintenance.startKm;
          
          // Check if maintenance is due
          let newStatus = maintenance.status;
          let shouldTriggerNotification = false;
          let notificationCreated = null;
          
          if (kmTraveled >= maintenance.targetKm) {
            if (maintenance.status !== 'Due' && maintenance.status !== 'Overdue' && !maintenance.isNotificationSent) {
              newStatus = 'Due';
              shouldTriggerNotification = true;
              
              // Create a new notification record
              try {
                const maintenanceNotification = new Maintenance({
                  appUserId: maintenance.appUserId,
                  bankId: maintenance.bankId,
                  vehicleId: maintenance.vehicleId,
                  category: maintenance.category,
                  categoryAmount: maintenance.categoryAmount,
                  targetKm: maintenance.targetKm,
                  startKm: maintenance.startKm,
                  endKm: currentKm,
                  totalKm: kmTraveled,
                  status: 'Due',
                  isCompleted: false,
                  isNotificationSent: true,
                  createdBy: maintenance.createdBy,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                
                await maintenanceNotification.save();
                notificationCreated = maintenanceNotification._id;
                console.log(`Notification created for maintenance ${maintenance._id}: ${notificationCreated}`);
              } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
              }
            }
            
            // Check if overdue (10% over target)
            if (kmTraveled > maintenance.targetKm * 1.1) {
              newStatus = 'Overdue';
            }
          }
          
          // Update the original maintenance record
          const updatedMaintenance = await Maintenance.findByIdAndUpdate(
            maintenance._id,
            {
              endKm: currentKm,
              totalKm: kmTraveled,
              status: newStatus,
              isNotificationSent: shouldTriggerNotification ? true : maintenance.isNotificationSent,
              lastCheckedAt: new Date()
            },
            { new: true }
          );
          
          updatedRecords.push({
            maintenanceId: maintenance._id,
            vehicleId: maintenance.vehicleId,
            currentKm,
            kmTraveled,
            targetKm: maintenance.targetKm,
            status: newStatus,
            notificationTriggered: shouldTriggerNotification,
            notificationId: notificationCreated
          });
        }
      } catch (error) {
        console.error(`Error updating maintenance ${maintenance._id}:`, error);
      }
    }
    
    return NextResponse.json({
      message: 'Maintenance monitoring check completed',
      updatedRecords,
      totalChecked: activeMaintenanceRecords.length
    });
  } catch (error) {
    console.error('Error in maintenance monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to check maintenance records' },
      { status: 500 }
    );
  }
}

// PUT - Update monitoring settings for a maintenance record
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { maintenanceId, isMonitoring } = body;
    
    if (!maintenanceId) {
      return NextResponse.json(
        { error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }
    
    const updateData: any = { isMonitoring };
    if (isMonitoring) {
      updateData.monitoringStartedAt = new Date();
    } else {
      updateData.monitoringStoppedAt = new Date();
    }
    
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      maintenanceId,
      updateData,
      { new: true }
    );
    
    if (!updatedMaintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: `Monitoring ${isMonitoring ? 'started' : 'stopped'} successfully`,
      maintenance: updatedMaintenance
    });
  } catch (error) {
    console.error('Error updating maintenance monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring settings' },
      { status: 500 }
    );
  }
}