"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchAttendance,
  bulkUpdateAttendance,
  setSelectedMonth,
  setSelectedYear,
  setSelectedDriverId,
  Attendance
} from "@/lib/redux/slices/attendanceSlice";
import { fetchDrivers } from "@/lib/redux/slices/driverSlice";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Truck,
  ChevronLeft,
  ChevronRight,
  Save
} from "lucide-react";
import { toast } from "react-hot-toast";

const AttendancePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    attendanceRecords,
    loading,
    error,
    selectedMonth,
    selectedYear,
    selectedDriverId
  } = useSelector((state: RootState) => state.attendance);
  
  const { drivers } = useSelector((state: RootState) => state.drivers);

  const [calendarData, setCalendarData] = useState<{[key: string]: Attendance}>({});
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: string}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentDate = new Date();
  const currentMonth = selectedMonth || currentDate.getMonth() + 1;
  const currentYear = selectedYear || currentDate.getFullYear();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const statusColors = {
    'Present': 'bg-green-100 text-green-800 border-green-200',
    'Absent': 'bg-red-100 text-red-800 border-red-200',
    'On Trip': 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const statusBackgroundColors = {
    'Present': 'bg-green-50 border-green-300',
    'Absent': 'bg-red-50 border-red-300',
    'On Trip': 'bg-blue-50 border-blue-300'
  };

  const statusIcons = {
    'Present': CheckCircle,
    'Absent': XCircle,
    'On Trip': Truck
  };

  useEffect(() => {
    dispatch(fetchDrivers());
  }, [dispatch]);

  useEffect(() => {
    if (selectedDriverId && selectedMonth && selectedYear) {
      dispatch(fetchAttendance({
        driverId: selectedDriverId,
        month: selectedMonth,
        year: selectedYear
      }));
    }
  }, [dispatch, selectedDriverId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    // Convert attendance array to calendar data object
    const calendarMap: {[key: string]: Attendance} = {};
    attendanceRecords.forEach((record: Attendance) => {
      const dateKey = new Date(record.date).getDate().toString();
      calendarMap[dateKey] = record;
    });
    setCalendarData(calendarMap);
  }, [attendanceRecords]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (hasUnsavedChanges) {
      toast.error("Please save your changes before changing the month");
      return;
    }

    let newMonth = currentMonth;
    let newYear = currentYear;

    if (direction === 'prev') {
      newMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      newYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    } else {
      newMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      newYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    }

    dispatch(setSelectedMonth(newMonth));
    dispatch(setSelectedYear(newYear));
    setPendingChanges({});
  };

  const handleDriverChange = (driverId: string) => {
    if (hasUnsavedChanges) {
      toast.error("Please save your changes before changing the driver");
      return;
    }
    
    dispatch(setSelectedDriverId(driverId));
    setPendingChanges({});
  };

  const handleStatusChange = (day: number, status: string) => {
    const dateKey = day.toString();
    setPendingChanges(prev => ({
      ...prev,
      [dateKey]: status
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedDriverId || Object.keys(pendingChanges).length === 0) {
      return;
    }

    try {
      const updates = Object.entries(pendingChanges).map(([day, status]) => ({
        driverId: selectedDriverId,
        date: new Date(currentYear, currentMonth - 1, parseInt(day)).toISOString().split('T')[0],
        status: status as 'Present' | 'Absent' | 'On Trip'
      }));

      await dispatch(bulkUpdateAttendance(updates)).unwrap();
      toast.success("Attendance updated successfully!");
      setPendingChanges({});
      setHasUnsavedChanges(false);
      
      // Refresh attendance data
      dispatch(fetchAttendance({
        driverId: selectedDriverId,
        month: currentMonth,
        year: currentYear
      }));
    } catch (error: any) {
      toast.error(error.message || "Failed to update attendance");
    }
  };

  const getStatusForDay = (day: number) => {
    const dateKey = day.toString();
    if (pendingChanges[dateKey]) {
      return pendingChanges[dateKey];
    }
    return calendarData[dateKey]?.status || null;
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-200"></div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getStatusForDay(day);
      const isToday = 
        day === currentDate.getDate() && 
        currentMonth === currentDate.getMonth() + 1 && 
        currentYear === currentDate.getFullYear();
      
      const isPending = pendingChanges[day.toString()];
      const attendanceRecord = calendarData[day.toString()];
      
      // Get background color based on status
      const getBackgroundColor = () => {
        if (isToday) return 'bg-blue-50 border-blue-300';
        if (status && statusBackgroundColors[status as keyof typeof statusBackgroundColors]) {
          return statusBackgroundColors[status as keyof typeof statusBackgroundColors];
        }
        return '';
      };

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
            getBackgroundColor()
          } ${isPending ? 'ring-2 ring-yellow-300' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
              {day}
            </span>
            {isPending && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            )}
          </div>
          
          {selectedDriverId && (
            <div className="space-y-1">
              {/* Status buttons */}
              <div className="flex flex-wrap gap-1">
                {(['Present', 'Absent', 'On Trip'] as const).map((statusOption) => {
                  const StatusIcon = statusIcons[statusOption];
                  const isSelected = status === statusOption;
                  
                  return (
                    <button
                      key={statusOption}
                      onClick={() => handleStatusChange(day, statusOption)}
                      className={`p-1 rounded text-xs flex items-center gap-1 transition-colors ${
                        isSelected 
                          ? statusColors[statusOption]
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={statusOption}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusOption === 'Present' && 'P'}
                      {statusOption === 'Absent' && 'A'}
                      {statusOption === 'On Trip' && 'T'}
                    </button>
                  );
                })}
              </div>
              
              {/* Trip info if on trip or present with trip details */}
              {attendanceRecord?.tripId && (status === 'On Trip' || (status === 'Present' && attendanceRecord.remarks === 'On Trip')) && (
                <div className="text-xs text-blue-600 truncate" title={`Trip: ${typeof attendanceRecord.tripId === 'object' ? attendanceRecord.tripId.tripId : attendanceRecord.tripId}`}>
                  Trip: {typeof attendanceRecord.tripId === 'object' ? attendanceRecord.tripId.tripId : attendanceRecord.tripId}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const getAttendanceSummary = () => {
    const summary = {
      present: 0,
      absent: 0,
      onTrip: 0,
      total: 0
    };

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getStatusForDay(day);
      if (status) {
        summary.total++;
        switch (status) {
          case 'Present':
            summary.present++;
            break;
          case 'Absent':
            summary.absent++;
            break;
          case 'On Trip':
            summary.onTrip++;
            break;
        }
      }
    }

    return summary;
  };

  const summary = getAttendanceSummary();
  const selectedDriver = drivers.find(d => d._id === selectedDriverId);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Driver Attendance</h1>
            <p className="text-muted-foreground">Manage driver attendance with calendar view</p>
          </div>
          {hasUnsavedChanges && (
            <Button onClick={handleSaveChanges} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Driver</Label>
              <Select
                value={selectedDriverId || ""}
                onValueChange={handleDriverChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Month & Year</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('prev')}
                  disabled={loading || hasUnsavedChanges}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[150px] text-center">
                  {months[currentMonth - 1]} {currentYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('next')}
                  disabled={loading || hasUnsavedChanges}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedDriverId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Days</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.present}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Trip Days</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.onTrip}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Marked</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {selectedDriver ? `${selectedDriver.name}'s Attendance` : 'Select a driver to view attendance'}
            </CardTitle>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedDriverId ? (
            <div>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-0 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="h-10 flex items-center justify-center font-semibold text-gray-600 border-b">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0 border border-gray-200">
                {renderCalendarGrid()}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>On Trip</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span>Pending Changes</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">How to use:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click on P (Present), A (Absent), or T (On Trip) buttons to mark attendance</li>
                  <li>• Yellow dots indicate unsaved changes</li>
                  <li>• Click "Save Changes" to save all pending updates</li>
                  <li>• Trip attendance is automatically marked when trips are completed</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Driver Selected</h3>
              <p className="text-gray-500">Please select a driver to view and manage attendance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
};

export default AttendancePage;