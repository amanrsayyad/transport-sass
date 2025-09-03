"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  fetchTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  setFilters,
  clearError,
  Trip,
  RouteWiseExpenseBreakdown,
  Expense
} from "@/lib/redux/slices/tripSlice";
import { fetchDrivers } from "@/lib/redux/slices/driverSlice";
import { fetchVehicles } from "@/lib/redux/slices/vehicleSlice";
import { fetchCustomers } from "@/lib/redux/slices/customerSlice";
import { fetchBanks } from "@/lib/redux/slices/bankSlice";
import { fetchAppUsers } from "@/lib/redux/slices/appUserSlice";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Edit,
  Trash2,
  Truck,
  Calendar,
  MapPin,
  DollarSign,
  Fuel,
  User,
  Eye,
  Filter,
  X
} from "lucide-react";
import { toast } from "react-hot-toast";

const TripsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    trips,
    loading,
    error,
    pagination,
    filters
  } = useSelector((state: RootState) => state.trips);
  
  const { drivers } = useSelector((state: RootState) => state.drivers);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  const { customers } = useSelector((state: RootState) => state.customers);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { user } = useSelector((state: RootState) => state.auth);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [showFuelAlert, setShowFuelAlert] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Trip>>({
    date: [new Date()],
    startKm: 0,
    endKm: 0,
    driverId: "",
    driverName: "",
    vehicleId: "",
    vehicleNumber: "",
    status: "Draft",
    remarks: "",
    routeWiseExpenseBreakdown: []
  });

  const [selectedVehicleFuelData, setSelectedVehicleFuelData] = useState<any>(null);
  const [selectedDriverBudget, setSelectedDriverBudget] = useState<any>(null);
  const [customerProducts, setCustomerProducts] = useState<any[]>([]);
  const [userBanks, setUserBanks] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    "Toll",
    "Gate Pass", 
    "Driver Allowance"
  ]);

  const paymentTypes = [
    "Cash",
    "UPI",
    "Net Banking",
    "Credit Card",
    "Debit Card",
    "Cheque"
  ];

  useEffect(() => {
    dispatch(fetchTrips(filters));
    dispatch(fetchDrivers());
    dispatch(fetchVehicles());
    dispatch(fetchCustomers());
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
  }, [dispatch, filters]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setEditingTrip(null);
    setFormData({
      date: [new Date()],
      startKm: 0,
      endKm: 0,
      driverId: "",
      driverName: "",
      vehicleId: "",
      vehicleNumber: "",
      status: "Draft",
      remarks: "",
      routeWiseExpenseBreakdown: []
    });
    setSelectedVehicleFuelData(null);
    setSelectedDriverBudget(null);
    setCustomerProducts([]);
    setUserBanks([]);
  };

  // Function to calculate trip fuel metrics
  const calculateTripFuelMetrics = (startKm: number | undefined, endKm: number | undefined, fuelData: any) => {
    if (!fuelData || !startKm || !endKm || endKm <= startKm) {
      return {
        tripDiselCost: 0,
        tripFuelQuantity: 0,
        totalTripKm: 0
      };
    }

    const totalTripKm = endKm - startKm;
    const tripFuelQuantity = totalTripKm / (fuelData.truckAverage || 1); // Use vehicle mileage
    const tripDiselCost = tripFuelQuantity * (fuelData.fuelRate || 0);

    return {
      tripDiselCost,
      tripFuelQuantity,
      totalTripKm
    };
  };

  const handleVehicleSelect = async (vehicleId: string) => {
    const vehicle = vehicles.find(v => v._id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleId,
        vehicleNumber: vehicle.registrationNumber
      }));

      // Fetch latest trip record to get end km for start km
      try {
        const tripResponse = await fetch(`/api/trips/latest/${vehicleId}`);
        let startKm = 0;
        
        if (tripResponse.ok) {
          const latestTrip = await tripResponse.json();
          startKm = latestTrip.endKm || 0;
        }

        // Update form data with the start km from latest trip
        setFormData(prev => ({
          ...prev,
          startKm
        }));

        // Fetch latest fuel tracking record
        const fuelResponse = await fetch(`/api/fuel-tracking/latest/${vehicleId}`);
        if (fuelResponse.ok) {
          const fuelData = await fuelResponse.json();
          setSelectedVehicleFuelData(fuelData);
          
          // Calculate fuel-related fields using the new function
          const fuelMetrics = calculateTripFuelMetrics(startKm, formData.endKm, fuelData);
          
          setFormData(prev => ({
            ...prev,
            ...fuelMetrics
          }));
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      }
    }
  };

  const handleDriverSelect = async (driverId: string) => {
    const driver = drivers.find(d => d._id === driverId);
    if (driver) {
      setFormData(prev => ({
        ...prev,
        driverId,
        driverName: driver.name
      }));

      // Fetch latest driver budget
      try {
        const response = await fetch(`/api/driver-budgets/latest/${driverId}`);
        if (response.ok) {
          const budgetData = await response.json();
          setSelectedDriverBudget(budgetData);
        }
      } catch (error) {
        console.error('Error fetching driver budget:', error);
      }
    }
  };

  const handleAppUserSelect = async (appUserId: string, routeIndex: number) => {
    try {
      const response = await fetch(`/api/app-users/${appUserId}/banks`);
      if (response.ok) {
        const userBanks = await response.json();
        // Update userBanks state to show only banks for this app user
        setUserBanks(userBanks);
        
        // If there's a default bank, set it
        if (userBanks.length > 0) {
          const defaultBank = userBanks[0];
          updateRoute(routeIndex, "bankId", defaultBank._id);
          updateRoute(routeIndex, "bankName", defaultBank.bankName);
        }
      }
    } catch (error) {
      console.error('Error fetching app user banks:', error);
    }
  };

  const handleCustomerSelect = async (customerId: string, routeIndex: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/products`);
      if (response.ok) {
        const products = await response.json();
        setCustomerProducts(products);
        
        // If there's a default product, set it
        if (products.length > 0) {
          const defaultProduct = products[0];
          updateRoute(routeIndex, "productName", defaultProduct.name);
          updateRoute(routeIndex, "rate", defaultProduct.rate);
          updateRoute(routeIndex, "routeAmount", defaultProduct.rate * (formData.routeWiseExpenseBreakdown?.[routeIndex]?.weight || 0));
        }
        
        // Update expense categories with customer-specific categories
        const customerCategories = products.map((p: any) => p.category).filter(Boolean);
        setExpenseCategories(prev => [...new Set([...prev, ...customerCategories])]);
        
        // Add customer-specific expense categories with default amounts
        const newExpenses = customerCategories.map((category: string) => ({
          category,
          amount: products.find((p: any) => p.category === category)?.rate || 0,
          quantity: 1,
          total: products.find((p: any) => p.category === category)?.rate || 0,
          description: ""
        }));
        
        // Add new expenses to the route
        if (newExpenses.length > 0) {
          setFormData(prev => ({
            ...prev,
            routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.map((route, i) => 
              i === routeIndex 
                ? { ...route, expenses: [...route.expenses, ...newExpenses] }
                : route
            ) || []
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching customer products:', error);
    }
  };

  const addRoute = () => {
    const newRoute: RouteWiseExpenseBreakdown = {
      routeNumber: (formData.routeWiseExpenseBreakdown?.length || 0) + 1,
      startLocation: "",
      endLocation: "",
      productName: "",
      weight: 0,
      rate: 0,
      routeAmount: 0,
      userId: "",
      userName: "",
      customerId: "",
      customerName: "",
      bankName: "",
      bankId: "",
      paymentType: "",
      expenses: [],
      totalExpense: 0
    };

    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: [...(prev.routeWiseExpenseBreakdown || []), newRoute]
    }));
  };

  const removeRoute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.filter((_, i) => i !== index) || []
    }));
  };

  const updateRoute = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.map((route, i) => 
        i === index ? { ...route, [field]: value } : route
      ) || []
    }));
  };

  const addExpenseToRoute = (routeIndex: number) => {
    const newExpense: Expense = {
      category: "",
      amount: 0,
      quantity: 1,
      total: 0,
      description: ""
    };

    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.map((route, i) => 
        i === routeIndex 
          ? { ...route, expenses: [...route.expenses, newExpense] }
          : route
      ) || []
    }));
  };

  const updateExpense = (routeIndex: number, expenseIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.map((route, i) => 
        i === routeIndex 
          ? {
              ...route,
              expenses: route.expenses.map((expense, j) => 
                j === expenseIndex 
                  ? { 
                      ...expense, 
                      [field]: value,
                      total: field === 'amount' || field === 'quantity' 
                        ? (field === 'amount' ? value : expense.amount) * (field === 'quantity' ? value : expense.quantity)
                        : expense.total
                    }
                  : expense
              )
            }
          : route
      ) || []
    }));
  };

  const removeExpenseFromRoute = (routeIndex: number, expenseIndex: number) => {
    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.map((route, i) => 
        i === routeIndex 
          ? { ...route, expenses: route.expenses.filter((_, j) => j !== expenseIndex) }
          : route
      ) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted!", { formData, user });
    
    // Check if user is authenticated and has an ID
    if (!user || !user.id) {
      console.error("User authentication failed:", { user });
      toast.error("User not authenticated. Please log in again.");
      return;
    }
    
    // Check if trip fuel quantity exceeds available fuel before submission
    if (selectedVehicleFuelData && (formData.tripFuelQuantity || 0) > selectedVehicleFuelData.fuelQuantity) {
      console.log("Fuel quantity check failed");
      // Show alert dialog instead of toast
      setShowFuelAlert(true);
      return;
    }
    
    try {
      const tripDataWithUser = {
        ...formData,
        createdBy: user.id // Add current user ID
      };
      
      console.log("About to dispatch:", { editingTrip, tripDataWithUser });
      
      if (editingTrip) {
        console.log("Updating trip...");
        await dispatch(updateTrip({ id: editingTrip._id, tripData: tripDataWithUser })).unwrap();
        toast.success("Trip updated successfully!");
      } else {
        console.log("Creating trip...");
        const result = await dispatch(createTrip(tripDataWithUser)).unwrap();
        console.log("Trip created successfully:", result);
        toast.success("Trip created successfully!");
      }
      handleSheetClose();
      dispatch(fetchTrips(filters));
    } catch (error: any) {
      console.error("Error saving trip:", error);
      toast.error(error.message || "Failed to save trip");
    }
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setFormData(trip);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTrip(id)).unwrap();
      toast.success("Trip deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete trip");
    }
  };

  const handleView = (trip: Trip) => {
    setViewingTrip(trip);
    setIsViewSheetOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  return (
    <DashboardLayout>
      {/* Fuel Alert Dialog */}
      <AlertDialog open={showFuelAlert} onOpenChange={setShowFuelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Fuel</AlertDialogTitle>
            <AlertDialogDescription>
              No fuel available in the vehicle. You need to add fuel first before creating this trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowFuelAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Trip Management</h1>
            <p className="text-muted-foreground">
              Manage vehicle trips and expenses
            </p>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button onClick={() => {
                setEditingTrip(null);
                setFormData({
                  date: [new Date()],
                  startKm: 0,
                  endKm: 0,
                  driverId: "",
                  driverName: "",
                  vehicleId: "",
                  vehicleNumber: "",
                  status: "Draft",
                  remarks: "",
                  routeWiseExpenseBreakdown: []
                });
                setSelectedVehicleFuelData(null);
                setSelectedDriverBudget(null);
                setCustomerProducts([]);
                setUserBanks([]);
                setIsSheetOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Trip
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85%] overflow-y-auto p-6">
              <SheetHeader>
                <SheetTitle>
                  {editingTrip ? "Edit Trip" : "Add New Trip"}
                </SheetTitle>
              </SheetHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Trip Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="date">Trip Dates</Label>
                      <Button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            date: [...(prev.date || []), new Date()],
                          }));
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Date
                      </Button>
                    </div>
                    {formData.date?.map((date, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          type="date"
                          value={
                            date
                              ? new Date(date).toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) => {
                            const newDates = [...(formData.date || [])];
                            newDates[index] = new Date(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              date: newDates,
                            }));
                          }}
                          required
                        />
                        {formData.date && formData.date.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => {
                              const newDates = formData.date?.filter(
                                (_, i) => i !== index
                              );
                              setFormData((prev) => ({
                                ...prev,
                                date: newDates,
                              }));
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {(!formData.date || formData.date.length === 0) && (
                      <Input
                        type="date"
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            date: [new Date(e.target.value)],
                          }))
                        }
                        required
                      />
                    )}
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: value as any,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="driver">Driver</Label>
                    <Select
                      value={formData.driverId}
                      onValueChange={handleDriverSelect}
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
                    <Label htmlFor="vehicle">Vehicle</Label>
                    <Select
                      value={formData.vehicleId}
                      onValueChange={handleVehicleSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle._id} value={vehicle._id}>
                            {vehicle.registrationNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startKm">Start KM</Label>
                    <Input
                      id="startKm"
                      type="number"
                      value={formData.startKm}
                      onChange={(e) => {
                        const startKm = Number(e.target.value);
                        const fuelMetrics = calculateTripFuelMetrics(startKm, formData.endKm, selectedVehicleFuelData);
                        
                        // Check if trip fuel quantity exceeds available fuel
                        if (selectedVehicleFuelData && fuelMetrics.tripFuelQuantity > selectedVehicleFuelData.fuelQuantity) {
                          // Show alert dialog instead of toast
                          setShowFuelAlert(true);
                          // Set endKm to zero when fuel is insufficient
                          setFormData((prev) => ({
                            ...prev,
                            startKm,
                            endKm: 0,
                            tripDiselCost: 0,
                            tripFuelQuantity: 0,
                            totalTripKm: 0
                          }));
                          return;
                        }
                        
                        setFormData((prev) => ({
                          ...prev,
                          startKm,
                          ...fuelMetrics
                        }));
                      }}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="endKm">End KM</Label>
                    <Input
                      id="endKm"
                      type="number"
                      value={formData.endKm}
                      onChange={(e) => {
                        const endKm = Number(e.target.value);
                        const fuelMetrics = calculateTripFuelMetrics(formData.startKm, endKm, selectedVehicleFuelData);
                        
                        // Check if trip fuel quantity exceeds available fuel
                        if (selectedVehicleFuelData && fuelMetrics.tripFuelQuantity > selectedVehicleFuelData.fuelQuantity) {
                          // Show alert dialog instead of toast
                          setShowFuelAlert(true);
                          // Set endKm to zero when fuel is insufficient
                          setFormData((prev) => ({
                            ...prev,
                            endKm: 0,
                            tripDiselCost: 0,
                            tripFuelQuantity: 0,
                            totalTripKm: 0
                          }));
                          return;
                        }
                        
                        setFormData((prev) => ({
                          ...prev,
                          endKm,
                          ...fuelMetrics
                        }));
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Fuel Information */}
                {selectedVehicleFuelData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Fuel Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-5 text-sm">
                        <div>
                          <Label>Total KM</Label>
                          <p className="font-semibold">
                            {(selectedVehicleFuelData.endKm || 0) -
                              (selectedVehicleFuelData.startKm || 0)}
                          </p>
                        </div>
                        <div>
                          <Label>Fuel Rate</Label>
                          <p className="font-semibold">
                            {selectedVehicleFuelData.fuelRate}
                          </p>
                        </div>
                        <div>
                          <Label>Fuel Available</Label>
                          <p className="font-semibold">
                            {selectedVehicleFuelData.fuelQuantity} L
                          </p>
                        </div>
                        <div>
                          <Label>Diesel Cost</Label>
                          <p className="font-semibold">
                            {selectedVehicleFuelData.totalAmount}
                          </p>
                        </div>
                        <div>
                          <Label>Vehicle Mileage</Label>
                          <p className="font-semibold">
                            {selectedVehicleFuelData.truckAverage} km/L
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Driver Budget Information */}
                {selectedDriverBudget && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Driver Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label>Total Budget</Label>
                          <p className="font-semibold">
                            {formatCurrency(selectedDriverBudget.budgetAmount)}
                          </p>
                        </div>
                        <div>
                          <Label>Remaining Budget</Label>
                          <p className="font-semibold">
                            {formatCurrency(
                              selectedDriverBudget.remainingBudget
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Route-wise Expense Breakdown */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-lg">
                      Route-wise Expense Breakdown
                    </Label>
                    <Button
                      type="button"
                      onClick={addRoute}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Route
                    </Button>
                  </div>

                  {formData.routeWiseExpenseBreakdown?.map(
                    (route, routeIndex) => (
                      <Card key={routeIndex} className="mb-4">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              Route {route.routeNumber}
                            </CardTitle>
                            <Button
                              type="button"
                              onClick={() => removeRoute(routeIndex)}
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Start Location</Label>
                              <Input
                                value={route.startLocation}
                                onChange={(e) =>
                                  updateRoute(
                                    routeIndex,
                                    "startLocation",
                                    e.target.value
                                  )
                                }
                                placeholder="Start location"
                              />
                            </div>
                            <div>
                              <Label>End Location</Label>
                              <Input
                                value={route.endLocation}
                                onChange={(e) =>
                                  updateRoute(
                                    routeIndex,
                                    "endLocation",
                                    e.target.value
                                  )
                                }
                                placeholder="End location"
                              />
                            </div>
                            <div>
                              <Label>Customer</Label>
                              <Select
                                value={route.customerId}
                                onValueChange={(value) => {
                                  const customer = customers.find(
                                    (c) => c._id === value
                                  );
                                  if (customer) {
                                    updateRoute(
                                      routeIndex,
                                      "customerId",
                                      value
                                    );
                                    updateRoute(
                                      routeIndex,
                                      "customerName",
                                      customer.companyName
                                    );
                                    handleCustomerSelect(value, routeIndex);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((customer) => (
                                    <SelectItem
                                      key={customer._id}
                                      value={customer._id}
                                    >
                                      {customer.companyName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>App User</Label>
                              <Select
                                value={route.userId}
                                onValueChange={(value) => {
                                  const appUser = appUsers.find(
                                    (u: any) => u._id === value
                                  );
                                  if (appUser) {
                                    updateRoute(routeIndex, "userId", value);
                                    updateRoute(
                                      routeIndex,
                                      "userName",
                                      appUser.name
                                    );
                                    handleAppUserSelect(value, routeIndex);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select app user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {appUsers.map((appUser: any) => (
                                    <SelectItem
                                      key={appUser._id}
                                      value={appUser._id}
                                    >
                                      {appUser.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Bank</Label>
                              <Select
                                value={route.bankId}
                                onValueChange={(value) => {
                                  const bank = userBanks.find(
                                    (b: any) => b._id === value
                                  );
                                  if (bank) {
                                    updateRoute(routeIndex, "bankId", value);
                                    updateRoute(
                                      routeIndex,
                                      "bankName",
                                      bank.bankName
                                    );
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select bank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {userBanks.map((bank: any) => (
                                    <SelectItem key={bank._id} value={bank._id}>
                                      {bank.bankName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Product Name</Label>
                              <Select
                                value={route.productName}
                                onValueChange={async (value) => {
                                  const product = customerProducts.find(
                                    (p) => p.productName === value
                                  );
                                  if (product) {
                                    updateRoute(
                                      routeIndex,
                                      "productName",
                                      value
                                    );
                                    updateRoute(
                                      routeIndex,
                                      "rate",
                                      product.productRate
                                    );
                                    updateRoute(
                                      routeIndex,
                                      "routeAmount",
                                      product.productRate * route.weight
                                    );

                                    // Fetch categories for this product
                                    try {
                                      const response = await fetch(
                                        `/api/customers/products/categories/${encodeURIComponent(
                                          value
                                        )}`
                                      );
                                      if (response.ok) {
                                        const categories =
                                          await response.json();
                                        const categoryNames = categories.map(
                                          (cat: any) => cat.categoryName
                                        );
                                        setExpenseCategories((prev) => [
                                          ...new Set([
                                            ...prev,
                                            ...categoryNames,
                                          ]),
                                        ]);
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error fetching product categories:",
                                        error
                                      );
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customerProducts.map((product) => (
                                    <SelectItem
                                      key={product._id}
                                      value={product.productName}
                                    >
                                      {product.productName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Weight (kg)</Label>
                              <Input
                                type="number"
                                value={route.weight}
                                onChange={(e) => {
                                  const weight = Number(e.target.value);
                                  updateRoute(routeIndex, "weight", weight);
                                  // Automatically calculate route amount = weight * rate
                                  updateRoute(
                                    routeIndex,
                                    "routeAmount",
                                    weight * route.rate
                                  );
                                }}
                                placeholder="Weight"
                              />
                            </div>
                            <div>
                              <Label>Rate (₹/kg)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={route.rate}
                                onChange={(e) => {
                                  const rate = Number(e.target.value);
                                  updateRoute(routeIndex, "rate", rate);
                                  updateRoute(
                                    routeIndex,
                                    "routeAmount",
                                    rate * route.weight
                                  );
                                }}
                                placeholder="Rate per kg"
                              />
                            </div>
                            <div>
                              <Label>Route Amount</Label>
                              <Input
                                type="number"
                                value={route.routeAmount}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>
                            <div>
                              <Label>Payment Type</Label>
                              <Select
                                value={route.paymentType}
                                onValueChange={(value) =>
                                  updateRoute(routeIndex, "paymentType", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Expenses for this route */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label className="text-sm font-medium">
                                Expenses
                              </Label>
                              <Button
                                type="button"
                                onClick={() => addExpenseToRoute(routeIndex)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Expense
                              </Button>
                            </div>

                            {route.expenses.map((expense, expenseIndex) => (
                              <div
                                key={expenseIndex}
                                className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 p-2 border rounded"
                              >
                                <div>
                                  <Label className="text-xs">Category</Label>
                                  <Select
                                    value={expense.category}
                                    onValueChange={async (value) => {
                                      updateExpense(
                                        routeIndex,
                                        expenseIndex,
                                        "category",
                                        value
                                      );

                                      // Fetch category rate and set it as amount
                                      try {
                                        const response = await fetch(
                                          `/api/customers/products/categories/${encodeURIComponent(
                                            route.productName
                                          )}`
                                        );
                                        if (response.ok) {
                                          const categories =
                                            await response.json();
                                          const selectedCategory =
                                            categories.find(
                                              (cat: any) =>
                                                cat.categoryName === value
                                            );
                                          if (selectedCategory) {
                                            updateExpense(
                                              routeIndex,
                                              expenseIndex,
                                              "amount",
                                              selectedCategory.categoryRate
                                            );
                                            // Also update total = amount * quantity
                                            updateExpense(
                                              routeIndex,
                                              expenseIndex,
                                              "total",
                                              selectedCategory.categoryRate *
                                                expense.quantity
                                            );
                                          }
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Error fetching category rate:",
                                          error
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {expenseCategories.map((category) => (
                                        <SelectItem
                                          key={category}
                                          value={category}
                                        >
                                          {category}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Amount</Label>
                                  <Input
                                    type="number"
                                    value={expense.amount}
                                    onChange={(e) =>
                                      updateExpense(
                                        routeIndex,
                                        expenseIndex,
                                        "amount",
                                        Number(e.target.value)
                                      )
                                    }
                                    placeholder="Amount"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Quantity</Label>
                                  <Input
                                    type="number"
                                    value={expense.quantity}
                                    onChange={(e) =>
                                      updateExpense(
                                        routeIndex,
                                        expenseIndex,
                                        "quantity",
                                        Number(e.target.value)
                                      )
                                    }
                                    placeholder="Qty"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Total</Label>
                                  <Input
                                    type="number"
                                    value={expense.total}
                                    readOnly
                                    className="bg-gray-50"
                                    placeholder="Total"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Description</Label>
                                  <Input
                                    value={expense.description || ""}
                                    onChange={(e) =>
                                      updateExpense(
                                        routeIndex,
                                        expenseIndex,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Description"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    onClick={() => removeExpenseFromRoute(routeIndex, expenseIndex)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                {/* Trip Summary */}
                <div className="mb-6">
                  <Label className="text-lg font-semibold mb-4 block">
                    Trip Summary
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Route Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Route Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Total Route Cost:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              (formData.routeWiseExpenseBreakdown || []).reduce(
                                (sum, route) => sum + (route.routeAmount || 0),
                                0
                              )
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Total Route Expenses:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              (formData.routeWiseExpenseBreakdown || []).reduce(
                                (sum, route) =>
                                  sum +
                                  (route.expenses || []).reduce(
                                    (expSum, exp) => expSum + (exp.total || 0),
                                    0
                                  ),
                                0
                              )
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium">
                            Remaining Amount:
                          </span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(
                              (formData.routeWiseExpenseBreakdown || []).reduce(
                                (sum, route) => sum + (route.routeAmount || 0),
                                0
                              ) -
                                (
                                  formData.routeWiseExpenseBreakdown || []
                                ).reduce(
                                  (sum, route) =>
                                    sum +
                                    (route.expenses || []).reduce(
                                      (expSum, exp) =>
                                        expSum + (exp.total || 0),
                                      0
                                    ),
                                  0
                                )
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Trip Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Trip Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Trip Diesel Cost:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(formData.tripDiselCost || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Trip Fuel Quantity:
                          </span>
                          <span className="font-medium">
                            {(formData.tripFuelQuantity || 0).toFixed(2)} L
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium">Total KM:</span>
                          <span className="font-bold">
                            {(formData.endKm || 0) - (formData.startKm || 0)} km
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    placeholder="Additional remarks..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSheetClose}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? "Saving..."
                      : editingTrip
                      ? "Update Trip"
                      : "Create Trip"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trips.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Trips
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {trips.filter((trip) => trip.status === "Completed").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  trips.reduce((sum, trip) => sum + trip.tripRouteCost, 0)
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fuel Cost</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  trips.reduce((sum, trip) => sum + trip.tripDiselCost, 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    dispatch(setFilters({ status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Driver</Label>
                <Select
                  value={filters.driverId}
                  onValueChange={(value) =>
                    dispatch(setFilters({ driverId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver._id} value={driver._id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vehicle</Label>
                <Select
                  value={filters.vehicleId}
                  onValueChange={(value) =>
                    dispatch(setFilters({ vehicleId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.vehicleNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total KM</TableHead>
                  <TableHead>Route Cost</TableHead>
                  <TableHead>Remaining Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip._id}>
                    <TableCell className="font-medium">{trip.tripId}</TableCell>
                    <TableCell>{formatDate(trip.date[0])}</TableCell>
                    <TableCell>{trip.driverName}</TableCell>
                    <TableCell>{trip.vehicleNumber}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(trip.status)}>
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{trip.totalKm} km</TableCell>
                    <TableCell>{formatCurrency(trip.tripRouteCost)}</TableCell>
                    <TableCell
                      className={
                        trip.remainingAmount >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(trip.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(trip)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(trip)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this trip? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(trip._id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Trip Sheet */}
        <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
          <SheetContent className="w-full max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Trip Details - {viewingTrip?.tripId}</SheetTitle>
            </SheetHeader>

            {viewingTrip && (
              <div className="space-y-6 mt-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Trip ID</Label>
                        <p className="font-semibold">{viewingTrip.tripId}</p>
                      </div>
                      <div>
                        <Label>Date</Label>
                        <p className="font-semibold">
                          {formatDate(viewingTrip.date[0])}
                        </p>
                      </div>
                      <div>
                        <Label>Driver</Label>
                        <p className="font-semibold">
                          {viewingTrip.driverName}
                        </p>
                      </div>
                      <div>
                        <Label>Vehicle</Label>
                        <p className="font-semibold">
                          {viewingTrip.vehicleNumber}
                        </p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Badge className={getStatusColor(viewingTrip.status)}>
                          {viewingTrip.status}
                        </Badge>
                      </div>
                      <div>
                        <Label>Total KM</Label>
                        <p className="font-semibold">
                          {viewingTrip.totalKm} km
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Route Cost</Label>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(viewingTrip.tripRouteCost)}
                        </p>
                      </div>
                      <div>
                        <Label>Trip Expenses</Label>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(viewingTrip.tripExpenses)}
                        </p>
                      </div>
                      <div>
                        <Label>Diesel Cost</Label>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(viewingTrip.tripDiselCost)}
                        </p>
                      </div>
                      <div>
                        <Label>Remaining Amount</Label>
                        <p
                          className={`font-semibold ${
                            viewingTrip.remainingAmount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(viewingTrip.remainingAmount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Route Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Route Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewingTrip.routeWiseExpenseBreakdown.map(
                      (route, index) => (
                        <div key={index} className="mb-6 p-4 border rounded">
                          <h4 className="font-semibold mb-4">
                            Route {route.routeNumber}: {route.startLocation} → {route.endLocation}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label>Customer</Label>
                              <p className="font-semibold">{route.customerName}</p>
                            </div>
                            <div>
                              <Label>Product</Label>
                              <p className="font-semibold">{route.productName}</p>
                            </div>
                            <div>
                              <Label>Weight</Label>
                              <p className="font-semibold">{route.weight} kg</p>
                            </div>
                            <div>
                              <Label>Route Amount</Label>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(route.routeAmount)}
                              </p>
                            </div>
                          </div>
                          
                          {route.expenses.length > 0 && (
                            <div className="mt-4">
                              <Label className="text-sm font-medium">Expenses</Label>
                              <div className="mt-2 space-y-2">
                                {route.expenses.map((expense, expIndex) => (
                                  <div key={expIndex} className="flex justify-between text-sm">
                                    <span>{expense.category}</span>
                                    <span>{formatCurrency(expense.total)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>

                {viewingTrip.remarks && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Remarks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{viewingTrip.remarks}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default TripsPage;