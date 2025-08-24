"use client";

import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import { fetchMaintenanceNotifications } from '@/lib/redux/slices/maintenanceSlice';

interface MaintenanceMonitorProps {
  intervalMs?: number; // Monitoring interval in milliseconds (default: 30 seconds)
  enabled?: boolean; // Whether monitoring is enabled
}

export function MaintenanceMonitor({ 
  intervalMs = 30000, // 30 seconds default
  enabled = true 
}: MaintenanceMonitorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMonitoringRef = useRef(false);

  const checkMaintenanceRecords = async () => {
    try {
      console.log('🔍 Checking maintenance records for updates...');
      
      // Call the monitoring API to check and update maintenance records
      const response = await fetch('/api/maintenance/monitor', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Maintenance monitoring check completed:', result);
        
        // If any notifications were triggered, refresh the notifications
        const hasNewNotifications = result.updatedRecords?.some(
          (record: any) => record.notificationTriggered
        );
        
        if (hasNewNotifications) {
          console.log('🔔 New maintenance notifications detected, refreshing...');
          dispatch(fetchMaintenanceNotifications());
        }
      } else {
        console.error('❌ Failed to check maintenance records:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error in maintenance monitoring:', error);
    }
  };

  const startMonitoring = () => {
    if (isMonitoringRef.current || !enabled) return;
    
    console.log(`🚀 Starting maintenance monitoring (interval: ${intervalMs}ms)`);
    isMonitoringRef.current = true;
    
    // Initial check
    checkMaintenanceRecords();
    
    // Set up interval for continuous monitoring
    intervalRef.current = setInterval(checkMaintenanceRecords, intervalMs);
  };

  const stopMonitoring = () => {
    if (!isMonitoringRef.current) return;
    
    console.log('🛑 Stopping maintenance monitoring');
    isMonitoringRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [enabled, intervalMs]);

  // Handle visibility change to pause/resume monitoring when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Tab hidden, pausing maintenance monitoring');
        stopMonitoring();
      } else if (enabled) {
        console.log('📱 Tab visible, resuming maintenance monitoring');
        startMonitoring();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs]);

  // This component doesn't render anything visible
  return null;
}

// Hook for manual maintenance monitoring control
export function useMaintenanceMonitor() {
  const dispatch = useDispatch<AppDispatch>();

  const triggerManualCheck = async () => {
    try {
      const response = await fetch('/api/maintenance/monitor', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        // Refresh notifications if any were triggered
        const hasNewNotifications = result.updatedRecords?.some(
          (record: any) => record.notificationTriggered
        );
        
        if (hasNewNotifications) {
          dispatch(fetchMaintenanceNotifications());
        }
        
        return result;
      } else {
        throw new Error('Failed to check maintenance records');
      }
    } catch (error) {
      console.error('Error in manual maintenance check:', error);
      throw error;
    }
  };

  const startMonitoringForMaintenance = async (maintenanceId: string) => {
    try {
      const response = await fetch('/api/maintenance/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maintenanceId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Started monitoring for maintenance:', maintenanceId);
        return result;
      } else {
        throw new Error('Failed to start monitoring');
      }
    } catch (error) {
      console.error('Error starting maintenance monitoring:', error);
      throw error;
    }
  };

  const updateMonitoringStatus = async (maintenanceId: string, isMonitoring: boolean) => {
    try {
      const response = await fetch('/api/maintenance/monitor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maintenanceId, isMonitoring }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${isMonitoring ? 'Started' : 'Stopped'} monitoring for maintenance:`, maintenanceId);
        return result;
      } else {
        throw new Error('Failed to update monitoring status');
      }
    } catch (error) {
      console.error('Error updating maintenance monitoring status:', error);
      throw error;
    }
  };

  return {
    triggerManualCheck,
    startMonitoringForMaintenance,
    updateMonitoringStatus,
  };
}