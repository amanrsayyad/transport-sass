"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchMaintenanceNotifications,
  acceptMaintenanceNotification,
  declineMaintenanceNotification,
} from "@/lib/redux/slices/maintenanceSlice";
import { Bell, AlertTriangle, X, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MaintenanceNotificationBell() {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications } = useSelector((state: RootState) => state.maintenance);
  const [isOpen, setIsOpen] = useState(false);
  const [processingNotifications, setProcessingNotifications] = useState<string[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

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
        
        // Show success message
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

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification._id)
  );
  
  const notificationCount = visibleNotifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Maintenance Notifications
            {notificationCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {notificationCount}
              </Badge>
            )}
          </h3>
        </div>
        
        {notificationCount === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No maintenance notifications
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="p-2 space-y-2">
              {visibleNotifications.map((notification) => {
                const isProcessing = processingNotifications.includes(notification._id);
                
                return (
                  <Card key={notification._id} className="border-red-200 bg-red-50">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1 mb-1">
                              <h4 className="text-sm font-semibold text-red-800">
                                {notification.category}
                              </h4>
                              {notification.notificationStatus === 'Declined' && (
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0">
                                  Declined
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-red-700">
                              <strong>{notification.vehicleNumber}</strong>
                            </p>
                          </div>
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
                        </div>
                        
                        <div className="text-xs text-red-600 space-y-1">
                          <div>
                            KM: {notification.totalKm.toLocaleString()} / {notification.targetKm.toLocaleString()}
                          </div>
                          <div>
                            Amount: ₹{notification.categoryAmount.toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="w-full bg-red-200 rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min((notification.totalKm / notification.targetKm) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                        
                        <div className="flex space-x-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-7"
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
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-100 text-xs h-7"
                            onClick={() => handleDeclineNotification(notification._id)}
                            disabled={isProcessing}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Later
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        {notificationCount > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                dispatch(fetchMaintenanceNotifications());
              }}
            >
              Refresh Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}