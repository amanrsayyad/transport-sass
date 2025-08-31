"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchMaintenanceNotifications,
  acceptMaintenanceNotification,
  declineMaintenanceNotification,
} from "@/lib/redux/slices/maintenanceSlice";
import { AlertTriangle, X, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MaintenanceNotification() {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications } = useSelector((state: RootState) => state.maintenance);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [processingNotifications, setProcessingNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Fetch notifications on component mount
    dispatch(fetchMaintenanceNotifications());

    // Set up interval to check for new notifications every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchMaintenanceNotifications());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleAcceptNotification = async (maintenanceId: string) => {
    try {
      setProcessingNotifications(prev => [...prev, maintenanceId]);
      
      // Call API to accept maintenance and handle all related operations
      const response = await fetch(`/api/maintenance/${maintenanceId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Maintenance accepted successfully:', result);
        
        // Update Redux state
        await dispatch(acceptMaintenanceNotification(maintenanceId)).unwrap();
        
        // Remove from dismissed list if it was there
        setDismissedNotifications(prev => prev.filter(id => id !== maintenanceId));
        
        // Show success message (you can add a toast notification here)
        alert(`Maintenance completed successfully! 
        - Bank balance updated
        - Expense record created
        - Transaction record generated`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept maintenance');
      }
    } catch (error) {
      console.error("Failed to accept maintenance notification:", error);
      alert(`Failed to accept maintenance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingNotifications(prev => prev.filter(id => id !== maintenanceId));
    }
  };

  const handleDeclineNotification = async (maintenanceId: string) => {
    try {
      setProcessingNotifications(prev => [...prev, maintenanceId]);
      
      // Call API to decline maintenance
      const response = await fetch(`/api/maintenance/${maintenanceId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Maintenance declined successfully:', result);
        
        // Update Redux state
        await dispatch(declineMaintenanceNotification(maintenanceId)).unwrap();
        
        // Add to dismissed list to hide from current view
        setDismissedNotifications(prev => [...prev, maintenanceId]);
        
        // Refresh notifications to show updated status
        dispatch(fetchMaintenanceNotifications());
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to decline maintenance');
      }
    } catch (error) {
      console.error("Failed to decline maintenance notification:", error);
      alert(`Failed to decline maintenance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingNotifications(prev => prev.filter(id => id !== maintenanceId));
    }
  };

  const handleDismissTemporarily = (maintenanceId: string) => {
    setDismissedNotifications(prev => [...prev, maintenanceId]);
  };

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification._id)
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {visibleNotifications.map((notification) => {
        const isProcessing = processingNotifications.includes(notification._id);
        
        return (
          <Card key={notification._id} className="border-red-200 bg-red-50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-red-800">
                        Maintenance Due
                      </h4>
                      {notification.notificationStatus === 'Declined' && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                          Declined
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDismissTemporarily(notification._id)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      <strong>{notification.vehicleNumber}</strong> needs {notification.category}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          notification.status === 'Overdue' 
                            ? 'border-red-600 text-red-600' 
                            : 'border-orange-600 text-orange-600'
                        }`}
                      >
                        {notification.status}
                      </Badge>
                      <span className="text-xs text-red-600">
                        {notification.totalKm.toLocaleString()} / {notification.targetKm.toLocaleString()} KM
                      </span>
                    </div>
                    
                    <div className="text-xs text-red-600">
                      Amount: ₹{notification.categoryAmount.toLocaleString()}
                    </div>
                    
                    <div className="w-full bg-red-200 rounded-full h-1.5">
                      <div
                        className="bg-red-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min((notification.totalKm / notification.targetKm) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAcceptNotification(notification._id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Processing...
                        </div>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
                      onClick={() => handleDeclineNotification(notification._id)}
                      disabled={isProcessing}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Later
                    </Button>
                  </div>
                  
                  {isProcessing && (
                    <div className="mt-2 text-xs text-blue-600">
                      Processing maintenance completion...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}