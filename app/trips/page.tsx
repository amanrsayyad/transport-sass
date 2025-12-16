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
  clearFilters,
  clearError,
  Trip,
  RouteWiseExpenseBreakdown,
  Expense
} from "@/lib/redux/slices/tripSlice";
import { fetchDrivers, createDriver } from "@/lib/redux/slices/driverSlice";
import { fetchVehicles, createVehicle } from "@/lib/redux/slices/vehicleSlice";
import { fetchCustomers, createCustomer, updateCustomer } from "@/lib/redux/slices/customerSlice";
import { fetchBanks } from "@/lib/redux/slices/bankSlice";
import { fetchAppUsers } from "@/lib/redux/slices/appUserSlice";
import { fetchLocations, createLocation } from "@/lib/redux/slices/locationSlice";
import { createDriverBudget } from "@/lib/redux/slices/operationsSlice";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Pagination from "@/components/common/Pagination";
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
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { DownloadButton } from "@/components/common/DownloadButton";

const TripsPage = () => {
  // Helper function to extract string value from PopulatedField
  const getStringValue = (field: any): string => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object' && field._id) return field._id;
    return '';
  };
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
  const { locations } = useSelector((state: RootState) => state.locations);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [showFuelAlert, setShowFuelAlert] = useState(false);
  // Standby form state and helpers
  const [isStandbyOpen, setIsStandbyOpen] = useState(false);
  const [standbyForm, setStandbyForm] = useState<{
    vehicleId: string;
    driverId: string;
    attendanceStatus: 'Present' | 'Absent';
    dates: string[];
    remarks: string;
    saving: boolean;
  }>({
    vehicleId: '',
    driverId: '',
    attendanceStatus: 'Absent',
    dates: [],
    remarks: '',
    saving: false
  });
  const [standbyLatestTripInfo, setStandbyLatestTripInfo] = useState<{ lastToLocation?: string; lastDate?: string; nextDate?: string; standbyDays?: number } | null>(null);
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [isBudgetCollapsed, setIsBudgetCollapsed] = useState(true);
  const [budgetForm, setBudgetForm] = useState({
    driverId: "",
    appUserId: "",
    bankId: "",
    paymentType: "",
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: "",
  });
  const [budgetBankOptions, setBudgetBankOptions] = useState<any[]>([]);
  const [budgetSelectedDriverBudget, setBudgetSelectedDriverBudget] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Trip>>({
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
  const [userBanks, setUserBanks] = useState<Record<number, any[]>>({});
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    "Toll",
    "Gate Pass", 
    "Driver Allowance",
    "Weigh Bridge",
    "Other"
  ]);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [newCategoryInputs, setNewCategoryInputs] = useState<Record<number, { name: string; rate: number }>>({});
  const [customerSearchQueries, setCustomerSearchQueries] = useState<Record<number, string>>({});
  const [newCustomerInputs, setNewCustomerInputs] = useState<Record<number, { customerName: string; companyName: string; mobileNo: string; open: boolean; saving: boolean }>>({});
  const [newProductInputs, setNewProductInputs] = useState<Record<number, { productName: string; productRate: number; open: boolean; saving: boolean }>>({});
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [driverFilterSearchQuery, setDriverFilterSearchQuery] = useState("");
  const [vehicleFilterSearchQuery, setVehicleFilterSearchQuery] = useState("");
  const [bankSearchQueries, setBankSearchQueries] = useState<Record<number, string>>({});
  const [startLocationSearchQueries, setStartLocationSearchQueries] = useState<Record<number, string>>({});
  const [endLocationSearchQueries, setEndLocationSearchQueries] = useState<Record<number, string>>({});
  const [newStartLocationInputs, setNewStartLocationInputs] = useState<Record<number, { locationName: string; open: boolean; saving: boolean }>>({});
  const [newEndLocationInputs, setNewEndLocationInputs] = useState<Record<number, { locationName: string; open: boolean; saving: boolean }>>({});

  // Standby info for selected vehicle (days since last trip)
  const [vehicleStandbyDays, setVehicleStandbyDays] = useState<number | null>(null);

  // Per-route multi-location entries: [{ from, to, status }]
  const [routeLocations, setRouteLocations] = useState<Record<number, { from: string; to: string; status: 'empty' | 'filled' }[]>>({});
  type LocationStatus = 'empty' | 'filled';

  // Inline creation inputs for per-entry From/To
  const [newFromLocationInputs, setNewFromLocationInputs] = useState<Record<string, { locationName: string; open: boolean; saving: boolean }>>({});
  const [newToLocationInputs, setNewToLocationInputs] = useState<Record<string, { locationName: string; open: boolean; saving: boolean }>>({});
  // Inline search queries for location selects, keyed by `${routeIndex}-${locIndex}-${field}`
  const [locationSearchQueries, setLocationSearchQueries] = useState<Record<string, string>>({});

  const setNewFromLocationInput = (key: string, field: 'locationName' | 'open' | 'saving', value: any) => {
    setNewFromLocationInputs((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { locationName: '', open: false, saving: false }), [field]: value },
    }));
  };

  // Load latest trip info for standby UI when vehicle changes
  useEffect(() => {
    const loadLatest = async () => {
      try {
        if (!standbyForm.vehicleId) {
          setStandbyLatestTripInfo(null);
          return;
        }
        const resp = await fetch(`/api/trips/latest/${standbyForm.vehicleId}`);
        const data = await resp.json();
        if (!data.error) {
          const lastDateStr = data.lastDate ? new Date(data.lastDate).toLocaleDateString() : undefined;
          const nextDateStr = data.nextDate ? new Date(data.nextDate).toLocaleDateString() : undefined;
          setStandbyLatestTripInfo({
            lastToLocation: data.lastToLocation,
            lastDate: lastDateStr,
            nextDate: nextDateStr,
            standbyDays: data.standbyDays
          });

          // Prefill the standby date input with the exact last trip date (not next day)
          // Normalize to YYYY-MM-DD for the date input value
          const toIsoYmd = (s: string | Date | null | undefined): string | null => {
            if (!s) return null;
            let dt: Date | null = null;
            if (s instanceof Date) {
              dt = s;
            } else if (typeof s === 'string') {
              const parts = s.split(/[-/]/);
              if (parts.length === 3) {
                // YYYY-MM-DD
                if (parts[0].length === 4) {
                  const y = Number(parts[0]);
                  const m = Number(parts[1]) - 1;
                  const d = Number(parts[2]);
                  const tmp = new Date(y, m, d);
                  dt = isNaN(tmp.getTime()) ? null : tmp;
                } else if (parts[2].length === 4) {
                  // DD-MM-YYYY
                  const d = Number(parts[0]);
                  const m = Number(parts[1]) - 1;
                  const y = Number(parts[2]);
                  const tmp = new Date(y, m, d);
                  dt = isNaN(tmp.getTime()) ? null : tmp;
                }
              }
              if (!dt) {
                const tmp = new Date(s);
                dt = isNaN(tmp.getTime()) ? null : tmp;
              }
            }
            if (!dt) return null;
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          };
          const isoLastDate = toIsoYmd(data.lastDate);
          if (isoLastDate) {
            const el = document.getElementById('standby-date-input') as HTMLInputElement | null;
            if (el) {
              el.value = isoLastDate;
            }
          }
        }
      } catch (err) {
        console.error('Failed to load latest trip info for standby:', err);
      }
    };
    loadLatest();
  }, [standbyForm.vehicleId]);

  const addStandbyDate = (dateStr: string) => {
    if (!dateStr) return;
    const normalized = dateStr.trim();
    if (!normalized) return;
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
    if (!valid) {
      toast.error('Please use date format YYYY-MM-DD');
      return;
    }
    setStandbyForm(prev => ({ ...prev, dates: Array.from(new Set([...(prev.dates || []), normalized])) }));
  };

  const removeStandbyDate = (dateStr: string) => {
    setStandbyForm(prev => ({ ...prev, dates: (prev.dates || []).filter(d => d !== dateStr) }));
  };

  const submitStandby = async () => {
    try {
      if (!standbyForm.vehicleId) { toast.error('Select a vehicle'); return; }
      if (!standbyForm.driverId) { toast.error('Select a driver'); return; }
      if (!user?.id) { toast.error('User not found'); return; }
      if (!standbyForm.dates || standbyForm.dates.length === 0) { toast.error('Add at least one standby date'); return; }

      setStandbyForm(prev => ({ ...prev, saving: true }));
      const resp = await fetch('/api/standby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: standbyForm.vehicleId,
          driverId: standbyForm.driverId,
          dates: standbyForm.dates,
          attendanceStatus: standbyForm.attendanceStatus,
          remarks: standbyForm.remarks,
          createdBy: user.id
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success('Standby saved and attendance updated');
        await handleVehicleSelect(standbyForm.vehicleId);
        setIsStandbyOpen(false);
        setStandbyForm(prev => ({ ...prev, dates: [], remarks: '', saving: false }));
      } else {
        throw new Error(data.error || 'Failed to save standby');
      }
    } catch (err: any) {
      console.error('Standby submission failed:', err);
      toast.error(err.message || 'Failed to save standby');
      setStandbyForm(prev => ({ ...prev, saving: false }));
    }
  };

  const setNewToLocationInput = (key: string, field: 'locationName' | 'open' | 'saving', value: any) => {
    setNewToLocationInputs((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { locationName: '', open: false, saving: false }), [field]: value },
    }));
  };

  const addLocationEntry = (routeIndex: number) => {
    setRouteLocations((prev) => {
      const list: { from: string; to: string; status: LocationStatus }[] = prev[routeIndex]
        ? [...prev[routeIndex]]
        : ([] as { from: string; to: string; status: LocationStatus }[]);
      const previousTo = list.length > 0 ? (list[list.length - 1].to || '') : '';
      const nextList = [...list, { from: previousTo, to: '', status: 'empty' as LocationStatus }];
      const updated: Record<number, { from: string; to: string; status: LocationStatus }[]> = {
        ...prev,
        [routeIndex]: nextList,
      };
      // Sync start/end with the new list so the route reflects chained locations
      syncStartEndLocationsFromList(routeIndex, nextList);
      return updated;
    });
  };

  const syncStartEndLocationsFromList = (routeIndex: number, list?: { from: string; to: string; status: 'empty' | 'filled' }[]) => {
    setFormData((prev) => {
      const routes = prev.routeWiseExpenseBreakdown || [];
      const locationsList = list ?? routeLocations[routeIndex] ?? [];
      const startLoc = locationsList.length ? (locationsList[0].from || routes[routeIndex]?.startLocation || '') : (routes[routeIndex]?.startLocation || '');
      const endLoc = locationsList.length ? (locationsList[locationsList.length - 1].to || routes[routeIndex]?.endLocation || '') : (routes[routeIndex]?.endLocation || '');
      const updatedRoutes = routes.map((r, i) => (i === routeIndex ? { ...r, startLocation: startLoc, endLocation: endLoc } : r));
      return { ...prev, routeWiseExpenseBreakdown: updatedRoutes };
    });
  };

  const updateLocationEntry = (
    routeIndex: number,
    locIndex: number,
    field: 'from' | 'to' | 'status',
    value: string
  ) => {
    setRouteLocations((prev) => {
      const list: { from: string; to: string; status: LocationStatus }[] = prev[routeIndex]
        ? [...prev[routeIndex]]
        : ([] as { from: string; to: string; status: LocationStatus }[]);
      const existing = list[locIndex] || { from: '', to: '', status: 'empty' as LocationStatus };
      const updatedEntry = { ...existing } as { from: string; to: string; status: LocationStatus };
      if (field === 'status') {
        updatedEntry.status = value as LocationStatus;
      } else if (field === 'from') {
        updatedEntry.from = value as string;
        // Chain: when setting a location's 'from', update previous entry's 'to' to match
        if (locIndex > 0) {
          const prevEntry = list[locIndex - 1] || { from: '', to: '', status: 'empty' as LocationStatus };
          list[locIndex - 1] = { ...prevEntry, to: value as string };
        }
      } else {
        // field is 'to'
        updatedEntry.to = value as string;
      }
      list[locIndex] = updatedEntry;
      const updated: Record<number, { from: string; to: string; status: LocationStatus }[]> = { ...prev, [routeIndex]: list };
      // Immediately sync start/end from updated list
      syncStartEndLocationsFromList(routeIndex, list);
      return updated;
    });
  };

  const removeLocationEntry = (routeIndex: number, locIndex: number) => {
    setRouteLocations((prev) => {
      const list: { from: string; to: string; status: LocationStatus }[] = prev[routeIndex]
        ? [...prev[routeIndex]]
        : ([] as { from: string; to: string; status: LocationStatus }[]);
      list.splice(locIndex, 1);
      const updated: Record<number, { from: string; to: string; status: LocationStatus }[]> = { ...prev, [routeIndex]: list };
      syncStartEndLocationsFromList(routeIndex, list);
      return updated;
    });
  };

  const handleCreateFromLocation = async (routeIndex: number, locIndex: number) => {
    const key = `${routeIndex}-${locIndex}`;
    const name = newFromLocationInputs[key]?.locationName?.trim();
    if (!name) {
      toast.error('Enter a location name');
      return;
    }
    setNewFromLocationInput(key, 'saving', true);
    try {
      const created = await dispatch(createLocation(name)).unwrap();
      updateLocationEntry(routeIndex, locIndex, 'from', created.locationName);
      setNewFromLocationInput(key, 'open', false);
      setNewFromLocationInput(key, 'locationName', '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create location');
    } finally {
      setNewFromLocationInput(key, 'saving', false);
    }
  };

  const handleCreateToLocation = async (routeIndex: number, locIndex: number) => {
    const key = `${routeIndex}-${locIndex}`;
    const name = newToLocationInputs[key]?.locationName?.trim();
    if (!name) {
      toast.error('Enter a location name');
      return;
    }
    setNewToLocationInput(key, 'saving', true);
    try {
      const created = await dispatch(createLocation(name)).unwrap();
      updateLocationEntry(routeIndex, locIndex, 'to', created.locationName);
      setNewToLocationInput(key, 'open', false);
      setNewToLocationInput(key, 'locationName', '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create location');
    } finally {
      setNewToLocationInput(key, 'saving', false);
    }
  };

  // Inline creation inputs for Driver and Vehicle
  const [newDriverInput, setNewDriverInput] = useState<{ name: string; mobileNo: string; status: "active" | "inactive" | "on-leave"; open: boolean; saving: boolean }>({
    name: "",
    mobileNo: "",
    status: "active",
    open: false,
    saving: false
  });

  const [newVehicleInput, setNewVehicleInput] = useState<{ registrationNumber: string; vehicleType: "truck" | "van" | "bus" | "car" | "motorcycle"; vehicleWeight: number; vehicleStatus: "available" | "in-use" | "maintenance" | "retired"; open: boolean; saving: boolean }>({
    registrationNumber: "",
    vehicleType: "truck",
    vehicleWeight: 0,
    vehicleStatus: "available",
    open: false,
    saving: false
  });

  const filteredCategories = expenseCategories.filter((c) =>
    c.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const paymentTypes = [
    "Cash",
    "UPI",
    "Net Banking",
    "Credit Card",
    "Debit Card",
    "Cheque"
  ];

  const handleResetFilters = () => {
    dispatch(clearFilters());
    setDriverFilterSearchQuery("");
    setVehicleFilterSearchQuery("");
  };

  useEffect(() => {
    dispatch(fetchTrips(filters));
    dispatch(fetchDrivers());
    dispatch(fetchVehicles());
    dispatch(fetchCustomers());
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
    dispatch(fetchLocations());
  }, [dispatch, filters]);

  // Bank options for driver budget card: show all active banks regardless of selected app user
  useEffect(() => {
    const filteredBanks = (banks || []).filter((bank: any) => bank.isActive);
    setBudgetBankOptions(filteredBanks);
  }, [banks]);

  // Keep budgetSelectedDriverBudget in sync with budgetForm.driverId or trip driver
  useEffect(() => {
    const currentBudgetDriverId = budgetForm.driverId || getStringValue(formData.driverId);
    if (!currentBudgetDriverId) {
      setBudgetSelectedDriverBudget(null);
      return;
    }
    // If the card driver is the same as the trip driver, use selectedDriverBudget
    if (currentBudgetDriverId === getStringValue(formData.driverId)) {
      setBudgetSelectedDriverBudget(selectedDriverBudget);
      return;
    }
    // Otherwise fetch latest budget for the selected card driver
    (async () => {
      try {
        const resp = await fetch(`/api/driver-budgets/latest/${currentBudgetDriverId}`);
        if (resp.ok) {
          const latest = await resp.json();
          setBudgetSelectedDriverBudget(latest);
        }
      } catch (err) {
        console.warn('Failed to fetch budget for selected card driver', err);
        setBudgetSelectedDriverBudget(null);
      }
    })();
  }, [budgetForm.driverId, formData.driverId, selectedDriverBudget]);

  const handlePageChange = (page: number) => {
    dispatch(fetchTrips({ ...filters, page, limit: pagination.limit }));
  };

  const setNewCategoryInput = (
    routeIndex: number,
    field: "name" | "rate",
    value: string | number
  ) => {
    setNewCategoryInputs((prev) => ({
      ...prev,
      [routeIndex]: {
        ...(prev[routeIndex] || { name: "", rate: 0 }),
        [field]: value as any,
      },
    }));
  };

  const setNewCustomerInput = (
    routeIndex: number,
    field: "customerName" | "companyName" | "mobileNo" | "open" | "saving",
    value: any
  ) => {
    setNewCustomerInputs((prev) => ({
      ...prev,
      [routeIndex]: {
        customerName: prev[routeIndex]?.customerName || "",
        companyName: prev[routeIndex]?.companyName || "",
        mobileNo: prev[routeIndex]?.mobileNo || "",
        open: prev[routeIndex]?.open || false,
        saving: prev[routeIndex]?.saving || false,
        [field]: value,
      },
    }));
  };

  const handleCreateCustomer = async (routeIndex: number) => {
    const form = newCustomerInputs[routeIndex] || { customerName: "", companyName: "", mobileNo: "" } as any;
    if (!form.customerName || !form.companyName || !form.mobileNo) {
      toast.error("Enter customer name, company name, and mobile number.");
      return;
    }
    try {
      setNewCustomerInput(routeIndex, "saving", true);
      const created = await dispatch(createCustomer({
        customerName: form.customerName,
        companyName: form.companyName,
        mobileNo: form.mobileNo,
        products: []
      }) as any).unwrap();
      toast.success("Customer added!");
      // Update route with new customer
      updateRoute(routeIndex, "customerId", created._id);
      updateRoute(routeIndex, "customerName", created.companyName);
      // Close and reset inline form
      setNewCustomerInputs((prev) => ({
        ...prev,
        [routeIndex]: { customerName: "", companyName: "", mobileNo: "", open: false, saving: false }
      }));
    } catch (error: any) {
      toast.error(error.message || "Failed to add customer");
      setNewCustomerInput(routeIndex, "saving", false);
    }
  };

  const setNewProductInput = (
    routeIndex: number,
    field: "productName" | "productRate" | "open" | "saving",
    value: any
  ) => {
    setNewProductInputs((prev) => ({
      ...prev,
      [routeIndex]: {
        productName: prev[routeIndex]?.productName || "",
        productRate: prev[routeIndex]?.productRate || 0,
        open: prev[routeIndex]?.open || false,
        saving: prev[routeIndex]?.saving || false,
        [field]: value,
      },
    }));
  };

  const handleCreateProduct = async (routeIndex: number) => {
    const form = newProductInputs[routeIndex] || { productName: "", productRate: 0 } as any;
    const customerIdRaw = formData.routeWiseExpenseBreakdown?.[routeIndex]?.customerId as any;
    const customerId = getStringValue(customerIdRaw);
    if (!customerId) {
      toast.error("Select a customer first.");
      return;
    }
    if (!form.productName || Number.isNaN(Number(form.productRate))) {
      toast.error("Enter product name and valid rate.");
      return;
    }
    try {
      setNewProductInput(routeIndex, "saving", true);
      const updatedCustomer = await dispatch(
        updateCustomer({
          id: customerId,
          data: {
            $push: {
              products: {
                productName: form.productName,
                productRate: Number(form.productRate),
                categories: [],
              },
            },
          } as any,
        }) as any
      ).unwrap();

      const products = updatedCustomer.products || [];
      setCustomerProducts(products);
      updateRoute(routeIndex, "productName", form.productName);
      updateRoute(routeIndex, "rate", Number(form.productRate));
      const weight = formData.routeWiseExpenseBreakdown?.[routeIndex]?.weight || 0;
      updateRoute(routeIndex, "routeAmount", Number(form.productRate) * Number(weight));

      toast.success("Product added!");
      setNewProductInputs((prev) => ({
        ...prev,
        [routeIndex]: { productName: "", productRate: 0, open: false, saving: false },
      }));
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
      setNewProductInput(routeIndex, "saving", false);
    }
  };

  const setNewStartLocationInput = (
    routeIndex: number,
    field: "locationName" | "open" | "saving",
    value: any
  ) => {
    setNewStartLocationInputs((prev) => ({
      ...prev,
      [routeIndex]: {
        locationName: prev[routeIndex]?.locationName || "",
        open: prev[routeIndex]?.open || false,
        saving: prev[routeIndex]?.saving || false,
        [field]: value,
      },
    }));
  };

  const setNewEndLocationInput = (
    routeIndex: number,
    field: "locationName" | "open" | "saving",
    value: any
  ) => {
    setNewEndLocationInputs((prev) => ({
      ...prev,
      [routeIndex]: {
        locationName: prev[routeIndex]?.locationName || "",
        open: prev[routeIndex]?.open || false,
        saving: prev[routeIndex]?.saving || false,
        [field]: value,
      },
    }));
  };

  const handleCreateStartLocation = async (routeIndex: number) => {
    const form = newStartLocationInputs[routeIndex] || { locationName: "" } as any;
    const name = (form.locationName || "").trim();
    if (!name) {
      toast.error("Enter a start location name.");
      return;
    }
    try {
      setNewStartLocationInput(routeIndex, "saving", true);
      const action = await dispatch(createLocation(name));
      if (createLocation.fulfilled.match(action)) {
        const created = action.payload;
        updateRoute(routeIndex, "startLocation", created.locationName);
        toast.success("Start location added!");
        setNewStartLocationInputs((prev) => ({
          ...prev,
          [routeIndex]: { locationName: "", open: false, saving: false },
        }));
      } else {
        const errMsg = (action as any).error?.message || "Failed to add location";
        toast.error(errMsg);
        setNewStartLocationInput(routeIndex, "saving", false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add location");
      setNewStartLocationInput(routeIndex, "saving", false);
    }
  };

  const handleCreateEndLocation = async (routeIndex: number) => {
    const form = newEndLocationInputs[routeIndex] || { locationName: "" } as any;
    const name = (form.locationName || "").trim();
    if (!name) {
      toast.error("Enter an end location name.");
      return;
    }
    try {
      setNewEndLocationInput(routeIndex, "saving", true);
      const action = await dispatch(createLocation(name));
      if (createLocation.fulfilled.match(action)) {
        const created = action.payload;
        updateRoute(routeIndex, "endLocation", created.locationName);
        toast.success("End location added!");
        setNewEndLocationInputs((prev) => ({
          ...prev,
          [routeIndex]: { locationName: "", open: false, saving: false },
        }));
      } else {
        const errMsg = (action as any).error?.message || "Failed to add location";
        toast.error(errMsg);
        setNewEndLocationInput(routeIndex, "saving", false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add location");
      setNewEndLocationInput(routeIndex, "saving", false);
    }
  };

  const extractId = (idLike: any) =>
    typeof idLike === "string" ? idLike : idLike?._id ?? "";

  const addCategoryForRoute = async (routeIndex: number) => {
    const input = newCategoryInputs[routeIndex] || { name: "", rate: 0 };
    const name = (input.name || "").trim();
    const rate = Number(input.rate ?? 0);
    if (!name) return;

    const route = (formData.routeWiseExpenseBreakdown || [])[routeIndex] as any;
    const customerId = extractId(route?.customerId);
    const productName = route?.productName;

    // If we have sufficient info, persist to backend; otherwise fallback to local list update
    if (customerId && productName) {
      try {
        const res = await fetch("/api/customers/products/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            productName,
            categories: [{ categoryName: name, categoryRate: rate }],
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          const names = (updated || []).map((c: any) => c.categoryName);
          setExpenseCategories((prev) => [...new Set([...prev, ...names])]);
        }
      } catch (e) {
        console.error("Failed to add category:", e);
      }
    } else {
      setExpenseCategories((prev) => [...new Set([...prev, name])]);
    }

    // Clear input values for this route
    setNewCategoryInputs((prev) => ({ ...prev, [routeIndex]: { name: "", rate: 0 } }));
  };

  const handleLimitChange = (limit: number) => {
    dispatch(fetchTrips({ ...filters, page: 1, limit }));
  };

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
    setRouteLocations({});
    setSelectedVehicleFuelData(null);
    setSelectedDriverBudget(null);
    setCustomerProducts([]);
    setUserBanks({});
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
        let lastToLocation = '';
        let lastDate: Date | null = null;
        let nextDate: Date | null = null;
        let standbyDays: number | null = null;
        let latestStandbyDateFromServer: Date | null = null;

        // Robust parser for dates that may arrive as 'DD-MM-YYYY' or 'YYYY-MM-DD'
        const parseDateUnknownFormat = (s: string): Date | null => {
          if (!s) return null;
          const parts = s.split(/[-/]/);
          if (parts.length === 3) {
            // YYYY-MM-DD
            if (parts[0].length === 4) {
              const y = Number(parts[0]);
              const m = Number(parts[1]) - 1;
              const d = Number(parts[2]);
              const dt = new Date(y, m, d);
              return isNaN(dt.getTime()) ? null : dt;
            }
            // DD-MM-YYYY
            if (parts[2].length === 4) {
              const d = Number(parts[0]);
              const m = Number(parts[1]) - 1;
              const y = Number(parts[2]);
              const dt = new Date(y, m, d);
              return isNaN(dt.getTime()) ? null : dt;
            }
          }
          const dt2 = new Date(s);
          return isNaN(dt2.getTime()) ? null : dt2;
        };

        if (tripResponse.ok) {
          const latestTrip = await tripResponse.json();
          startKm = latestTrip.endKm || 0;
          lastToLocation = latestTrip.lastToLocation || '';
          standbyDays = typeof latestTrip.standbyDays === 'number' ? latestTrip.standbyDays : null;
          if (latestTrip.lastDate) {
            const ld = parseDateUnknownFormat(latestTrip.lastDate);
            if (ld && !isNaN(ld.getTime())) {
              lastDate = ld;
            }
          }
          if (latestTrip.nextDate) {
            const nd = parseDateUnknownFormat(latestTrip.nextDate);
            if (nd && !isNaN(nd.getTime())) {
              nextDate = nd;
            }
          }
        }

        // Also fetch latest standby date for this vehicle to derive next working date
        try {
          const standbyResp = await fetch(`/api/standby?vehicleId=${vehicleId}`);
          if (standbyResp.ok) {
            const sdata = await standbyResp.json();
            if (sdata && sdata.latestStandbyDate) {
              const lsd = parseDateUnknownFormat(sdata.latestStandbyDate);
              if (lsd && !isNaN(lsd.getTime())) {
                latestStandbyDateFromServer = lsd;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to fetch latest standby for vehicle', vehicleId, e);
        }

        // Update form data with the start km from latest trip
        setFormData(prev => ({
          ...prev,
          startKm
        }));

        // Prefill date and first route's start location based on latest trip and standby.
        // Goal: if last standby date is 14-12-2025, set new trip date to 15-12-2025.
        const prefillDate = (() => {
          // If standby form already has dates, take the max and add 1 day
          if (standbyForm?.dates && standbyForm.dates.length > 0) {
            const parseYmd = (s: string) => {
              const [y, m, d] = s.split('-').map(Number);
              return new Date(y, (m || 1) - 1, d || 1);
            };
            const sorted = standbyForm.dates
              .map(parseYmd)
              .filter(dt => !isNaN(dt.getTime()))
              .sort((a, b) => a.getTime() - b.getTime());
            if (sorted.length > 0) {
              const last = sorted[sorted.length - 1];
              const nd = new Date(last);
              nd.setDate(nd.getDate() + 1);
              return nd;
            }
          }
          // If there is a recorded standby date, start the trip the day after it
          if (latestStandbyDateFromServer) {
            const nd = new Date(latestStandbyDateFromServer);
            nd.setDate(nd.getDate() + 1);
            return nd;
          }
          // Vehicle not on standby: use the day after the last trip date
          if (lastDate) {
            const nd = new Date(lastDate);
            nd.setDate(nd.getDate() + 1);
            return nd;
          }
          // As a fallback, if server provided a nextDate and we don't have lastDate
          if (nextDate) return nextDate;
          // Fallback to today
          return new Date();
        })();
        if (prefillDate) {
          setFormData(prev => {
            const routes = prev.routeWiseExpenseBreakdown || [];
            if (routes.length === 0) {
              const newRoute: RouteWiseExpenseBreakdown = {
                routeNumber: 1,
                startLocation: lastToLocation || '',
                endLocation: '',
                productName: '',
                weight: 0,
                rate: 0,
                routeAmount: 0,
                advanceAmount: 0,
                dates: [prefillDate as Date],
                userId: "",
                userName: "",
                customerId: "",
                customerName: "",
                bankName: "",
                bankId: "",
                paymentType: "",
                routeStatus: 'In Progress',
                expenses: [],
                totalExpense: 0
              };
              return { ...prev, date: [prefillDate as Date], routeWiseExpenseBreakdown: [newRoute] };
            } else {
              const updatedRoutes = routes.map((r, i) => {
                if (i !== 0) return r as any;
                // Override the first route's date to the previous trip's last date (or nextDate/today as fallback)
                return { ...r, startLocation: lastToLocation || r.startLocation || '', dates: [prefillDate as Date] } as any;
              });
              return { ...prev, date: [prefillDate as Date], routeWiseExpenseBreakdown: updatedRoutes };
            }
          });
        }

        // Keep route locations map in sync for first route start location
        if (lastToLocation) {
          const firstRouteList = [{ from: lastToLocation, to: '', status: 'empty' as LocationStatus }];
          setRouteLocations(prev => ({ ...prev, 0: firstRouteList }));
          syncStartEndLocationsFromList(0, firstRouteList);
        }

        // Set standby info for UI
        setVehicleStandbyDays(standbyDays);
        // Prefill standby form with selected vehicle
        setStandbyForm(prev => ({ ...prev, vehicleId }));

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

  // Budget card driver selection and carry-forward sync
  const handleBudgetDriverSelect = async (driverId: string) => {
    setBudgetForm(prev => ({ ...prev, driverId }));
    try {
      const resp = await fetch(`/api/driver-budgets/latest/${driverId}`);
      if (resp.ok) {
        const latest = await resp.json();
        setBudgetSelectedDriverBudget(latest);
      }
    } catch (err) {
      console.warn('Failed to fetch latest driver budget for budget card', err);
      setBudgetSelectedDriverBudget(null);
    }
  };

  // Inline assign driver budget from Trips form top section
  const handleAssignBudget = async () => {
    try {
      const driverId = budgetForm.driverId || getStringValue(formData.driverId);
      if (!driverId) {
        toast.error("Select a driver first.");
        return;
      }
      if (!budgetForm.appUserId || !budgetForm.bankId || !budgetForm.paymentType) {
        toast.error("Select app user, bank account, and payment type.");
        return;
      }
      const amount = Number(budgetForm.amount || 0);
      if (amount <= 0) {
        toast.error("Enter a positive budget amount.");
        return;
      }

      if (budgetSelectedDriverBudget && Number(budgetSelectedDriverBudget.remainingBudgetAmount || 0) > 0) {
        toast.info("Carry-forward will be added automatically to this allocation.");
      }

      const payload: any = {
        appUserId: budgetForm.appUserId,
        bankId: budgetForm.bankId,
        driverId,
        dailyBudgetAmount: amount,
        date: budgetForm.date,
        description: budgetForm.description,
        paymentType: budgetForm.paymentType,
      };

      await dispatch(createDriverBudget(payload)).unwrap();
      toast.success("Driver budget allocated successfully.");

      // Refresh budget for the selected driver
      try {
        const resp = await fetch(`/api/driver-budgets/latest/${driverId}`);
        if (resp.ok) {
          const latest = await resp.json();
          setBudgetSelectedDriverBudget(latest);
          // Also refresh the trip driver's budget if we allocated for the trip driver
          if (driverId === getStringValue(formData.driverId)) {
            setSelectedDriverBudget(latest);
          }
        }
      } catch (err) {
        console.warn('Could not refresh latest driver budget', err);
      }
      // Reset the budget form and collapse the card
      setBudgetForm({
        driverId: "",
        appUserId: "",
        bankId: "",
        paymentType: "",
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: "",
      });
      setIsBudgetCollapsed(true);
    } catch (error: any) {
      console.error("Failed to allocate driver budget:", error);
      toast.error(error?.message || "Failed to allocate driver budget");
    }
  };

  // Inline create Driver and auto-select
  const handleCreateDriverInline = async () => {
    const { name, mobileNo, status } = newDriverInput;
    if (!name || !mobileNo) {
      toast.error("Enter driver name and mobile number.");
      return;
    }
    try {
      setNewDriverInput(prev => ({ ...prev, saving: true }));
      const created = await dispatch(createDriver({ name, mobileNo, status }) as any).unwrap();
      toast.success("Driver added!");
      // Reset inline form and close
      setNewDriverInput({ name: "", mobileNo: "", status: "active", open: false, saving: false });
      // Auto-select new driver
      await handleDriverSelect(created._id);
    } catch (error: any) {
      console.error("Failed to create driver:", error);
      toast.error(error.message || "Failed to create driver");
      setNewDriverInput(prev => ({ ...prev, saving: false }));
    }
  };

  const handleAppUserSelect = async (appUserId: string, routeIndex: number) => {
    try {
      // Show all banks for any selected app user, as requested
      const endpoint = "/api/banks";

      const response = await fetch(endpoint);
      if (response.ok) {
        const banksList = await response.json();
        // Scope banks to the specific route to prevent cross-route leakage
        setUserBanks(prev => ({ ...prev, [routeIndex]: banksList }));

        // If there's a default bank, set it
        if (banksList.length > 0) {
          const defaultBank = banksList[0];
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
    // Determine the next date based on the last selected date across all routes
    const existingRoutes = formData.routeWiseExpenseBreakdown || [];
    let lastSelectedDate: Date | null = null;
    for (const r of existingRoutes) {
      const rd = r.dates || [];
      for (const d of rd) {
        // Coerce to Date instance
        const asDate = new Date(d as Date);
        lastSelectedDate = asDate;
      }
    }
    const nextDateForNewRoute = (() => {
      if (lastSelectedDate) {
        const nd = new Date(lastSelectedDate);
        nd.setDate(nd.getDate() + 1);
        return nd;
      }
      return new Date();
    })();

    const newRoute: RouteWiseExpenseBreakdown = {
      routeNumber: (formData.routeWiseExpenseBreakdown?.length || 0) + 1,
      startLocation: "",
      endLocation: "",
      productName: "",
      weight: 0,
      rate: 0,
      routeAmount: 0,
      advanceAmount: 0,
      // Initialize with the next date in sequence
      dates: [nextDateForNewRoute],
      userId: "",
      userName: "",
      customerId: "",
      customerName: "",
      bankName: "",
      bankId: "",
      paymentType: "",
      routeStatus: 'In Progress',
      expenses: [],
      totalExpense: 0
    };

    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: [...(prev.routeWiseExpenseBreakdown || []), newRoute]
    }));
    const newIndex = (formData.routeWiseExpenseBreakdown?.length || 0);
    const prevIndex = newIndex - 1;
    // Seed the first 'from' of the new route from the previous route's last 'to'
    const previousList = prevIndex >= 0 ? (routeLocations[prevIndex] || []) : [];
    const previousLastTo = previousList.length > 0
      ? (previousList[previousList.length - 1].to || '')
      : (existingRoutes[prevIndex]?.endLocation || '');
    const initialNewRouteList: { from: string; to: string; status: LocationStatus }[] = [
      { from: previousLastTo, to: '', status: 'empty' as LocationStatus }
    ];
    setRouteLocations((prev) => {
      // If previous route's last 'to' is empty but we have an inferred value, set it
      let patchedPrevList = previousList;
      if (prevIndex >= 0 && previousList.length > 0 && !previousList[previousList.length - 1].to && previousLastTo) {
        const last = previousList[previousList.length - 1];
        patchedPrevList = [
          ...previousList.slice(0, -1),
          { ...last, to: previousLastTo }
        ];
      }
      const updated: Record<number, { from: string; to: string; status: LocationStatus }[]> = {
        ...prev,
        ...(prevIndex >= 0 ? { [prevIndex]: patchedPrevList } : {}),
        [newIndex]: initialNewRouteList,
      };
      // Sync both affected routes to reflect start/end updates
      if (prevIndex >= 0) {
        syncStartEndLocationsFromList(prevIndex, patchedPrevList);
      }
      syncStartEndLocationsFromList(newIndex, initialNewRouteList);
      return updated;
    });
  };

  const removeRoute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      routeWiseExpenseBreakdown: prev.routeWiseExpenseBreakdown?.filter((_, i) => i !== index) || []
    }));
    // Reindex routeLocations to match new route order
    setRouteLocations((prev) => {
      const newMap: Record<number, { from: string; to: string; status: 'empty' | 'filled' }[]> = {};
      const keys = Object.keys(prev).map(Number).sort((a, b) => a - b);
      let cursor = 0;
      for (const k of keys) {
        if (k === index) continue;
        newMap[cursor] = prev[k];
        cursor++;
      }
      return newMap;
    });
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
      // Default quantity mirrors current route weight
      quantity: (formData.routeWiseExpenseBreakdown?.[routeIndex]?.weight || 0),
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
  const availableFuelLiters = selectedVehicleFuelData
  ? (selectedVehicleFuelData.fuelQuantity || 0)
      : 0;
    if (selectedVehicleFuelData && (formData.tripFuelQuantity || 0) > availableFuelLiters) {
      console.log("Fuel quantity check failed");
      // Reset endKm and trip fuel metrics when insufficient fuel
      setFormData(prev => ({
        ...prev,
        endKm: 0,
        tripFuelQuantity: 0,
      }));
      // Show alert dialog
      setShowFuelAlert(true);
      return;
    }
    
    // Validate required fields for trip and routes
    const validateTripData = (data: any) => {
      const errors: string[] = [];
      if (!data.driverId) errors.push("Select a driver.");
      if (!data.vehicleId) errors.push("Select a vehicle.");
      if (data.endKm <= data.startKm) errors.push("End KM must be greater than Start KM.");
      (data.routeWiseExpenseBreakdown || []).forEach((route: any, idx: number) => {
        const missing: string[] = [];
        if (!route.customerId) missing.push("customer");
        if (!route.userId) missing.push("app user");
        if (!route.bankId) missing.push("bank");
        if (!route.paymentType) missing.push("payment type");
        if (!route.startLocation) missing.push("start location");
        if (!route.endLocation) missing.push("end location");
        if (!route.productName) missing.push("product");
        if (!route.weight || route.weight <= 0) missing.push("weight");
        if (route.rate === undefined || route.rate === null) missing.push("rate");
        if (missing.length) {
          errors.push(`Route ${idx + 1}: set ${missing.join(", ")}.`);
        }
        (route.expenses || []).forEach((exp: any, j: number) => {
          const expIssues: string[] = [];
          if (!exp.category) expIssues.push("category");
          if (exp.amount === undefined || exp.amount === null || Number(exp.amount) <= 0) expIssues.push("amount");
          if (exp.quantity === undefined || exp.quantity === null || Number(exp.quantity) <= 0) expIssues.push("quantity");
          if (expIssues.length) {
            errors.push(`Route ${idx + 1}, expense ${j + 1}: set ${expIssues.join(", ")}.`);
          }
        });
      });
      return errors;
    };

    try {
      // Normalize expenses and compute per-route and trip totals
      const normalizedRoutes = (formData.routeWiseExpenseBreakdown || []).map((route, idx) => {
        const expenses = (route.expenses || []).map((exp) => ({
          ...exp,
          amount: Number(exp.amount || 0),
          quantity: Number(exp.quantity || 0),
          total: Number(exp.total || 0),
        }));
        const totalExpense = expenses.reduce((sum, exp) => sum + (exp.total || 0), 0);
        const advanceAmount = Number((route as any).advanceAmount ?? 0);
        const locationsList = routeLocations[idx] || [];
        const startLoc = locationsList.length ? (locationsList[0].from || route.startLocation) : route.startLocation;
        const endLoc = locationsList.length ? (locationsList[locationsList.length - 1].to || route.endLocation) : route.endLocation;
        return { ...route, startLocation: startLoc, endLocation: endLoc, expenses, totalExpense, advanceAmount };
      });

      const tripRouteCost = normalizedRoutes.reduce((sum, r) => sum + (Number(r.routeAmount) || 0), 0);
      const tripExpenses = normalizedRoutes.reduce((sum, r) => sum + (Number(r.totalExpense) || 0), 0);
      const remainingAmount = tripRouteCost - tripExpenses - (formData.tripDiselCost || 0);

      // Derive top-level trip date from route-level dates to satisfy backend
      const firstRouteWithDate = normalizedRoutes.find(r => (r.dates && r.dates.length));
      const derivedDates: Date[] = (formData.date && formData.date.length > 0)
        ? (formData.date as Date[])
        : (firstRouteWithDate?.dates?.[0] ? [firstRouteWithDate.dates[0] as Date] : [new Date()]);

      const tripDataWithUser = {
        ...formData,
        date: derivedDates,
        routeWiseExpenseBreakdown: normalizedRoutes,
        tripRouteCost,
        tripExpenses,
        remainingAmount,
        createdBy: user.id // Add current user ID
      };

      const validationErrors = validateTripData(tripDataWithUser);
      if (validationErrors.length) {
        console.warn("Trip form validation failed:", validationErrors);
        toast.error(validationErrors[0]);
        return;
      }
      
      // Validate driver budget availability and sufficiency
      const remainingDriverBudget = Number(selectedDriverBudget?.remainingBudgetAmount || 0);
      if (!selectedDriverBudget || remainingDriverBudget <= 0) {
        setShowBudgetAlert(true);
        toast.error("Assign driver budget first.");
        return;
      }
      if (tripExpenses > remainingDriverBudget) {
        setShowBudgetAlert(true);
        toast.error("Trip expenses exceed remaining driver budget.");
        return;
      }
      
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

        // After creating the trip, set attendance for the selected driver
        // Status: Present; Dates: from earliest route date to latest route date (inclusive)
        try {
          // Extract driverId from result (may be populated object)
          const driverIdForAttendance: string = typeof result.driverId === 'object' ? (result.driverId?._id || tripDataWithUser.driverId as string) : (result.driverId || tripDataWithUser.driverId as string);

          // Flatten all route dates to compute start and end
          const allRouteDates: Date[] = (result.routeWiseExpenseBreakdown || [])
            .flatMap((r: any) => (r.dates || []).map((d: any) => new Date(d)))
            .filter((dt: Date) => !isNaN(dt.getTime()))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());

          // Fallback to top-level trip date if route-level dates are absent
          if (allRouteDates.length === 0 && Array.isArray(result.date) && result.date.length > 0) {
            const d0 = new Date(result.date[0]);
            if (!isNaN(d0.getTime())) {
              allRouteDates.push(d0);
            }
          }

          if (allRouteDates.length > 0 && driverIdForAttendance) {
            const startDate = new Date(allRouteDates[0]);
            const endDate = new Date(allRouteDates[allRouteDates.length - 1]);

            // Generate inclusive range of dates (YYYY-MM-DD) from start to end
            const toYmd = (dt: Date) => {
              const y = dt.getFullYear();
              const m = String(dt.getMonth() + 1).padStart(2, '0');
              const d = String(dt.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            };
            const datesInRange: string[] = [];
            const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const limit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            while (cursor.getTime() <= limit.getTime()) {
              datesInRange.push(toYmd(cursor));
              cursor.setDate(cursor.getDate() + 1);
            }

            // Create or upsert attendance for each date as Present
            // Prefer POST to ensure createdBy and trip linkage are set properly
            await Promise.all(datesInRange.map(async (ymd) => {
              try {
                const resp = await fetch('/api/attendance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    driverId: driverIdForAttendance,
                    date: ymd,
                    status: 'Present',
                    remarks: 'On Trip',
                    tripId: result._id,
                    tripNumber: result.tripId,
                    createdBy: user.id
                  })
                });
                if (!resp.ok) {
                  // Ignore duplicate errors; otherwise log
                  const err = await resp.json().catch(() => ({} as any));
                  if (resp.status !== 400) {
                    console.warn('Attendance POST failed for', ymd, err);
                  }
                }
              } catch (e) {
                console.warn('Attendance creation error for', ymd, e);
              }
            }));
          }
        } catch (e) {
          console.warn('Failed to set attendance after trip creation:', e);
        }
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
    // Extract IDs from populated objects for form fields while preserving names
    const formDataWithIds = {
      ...trip,
      driverId: typeof trip.driverId === 'object' ? trip.driverId._id : trip.driverId,
      vehicleId: typeof trip.vehicleId === 'object' ? trip.vehicleId._id : trip.vehicleId,
      routeWiseExpenseBreakdown: trip.routeWiseExpenseBreakdown?.map(route => ({
        ...route,
        bankId: typeof route.bankId === 'object' ? route.bankId._id : route.bankId,
        customerId: typeof route.customerId === 'object' ? route.customerId._id : route.customerId,
        userId: typeof route.userId === 'object' ? route.userId._id : route.userId,
        // Preserve bankName and productName from the original data
        bankName: route.bankName || (typeof route.bankId === 'object' ? route.bankId.bankName : ''),
        productName: route.productName || '',
        advanceAmount: Number((route as any).advanceAmount || 0),
        routeStatus: route.routeStatus || 'In Progress',
        expenses: route.expenses || []
      })) || []
    };
    setFormData(formDataWithIds);
    // Initialize routeLocations with at least one entry from existing start/end
    const initialLocations: Record<number, { from: string; to: string; status: 'empty' | 'filled' }[]> = {};
    (formDataWithIds.routeWiseExpenseBreakdown || []).forEach((route: any, idx: number) => {
      const hasBoth = !!route.startLocation && !!route.endLocation;
      initialLocations[idx] = [{ from: route.startLocation || '', to: route.endLocation || '', status: hasBoth ? 'filled' : 'empty' }];
    });
    setRouteLocations(initialLocations);
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
    <ProtectedRoute>
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

      {/* Budget Alert Dialog */}
      <AlertDialog open={showBudgetAlert} onOpenChange={setShowBudgetAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Driver Budget Required</AlertDialogTitle>
            <AlertDialogDescription>
              Trip expenses exceed the remaining driver budget. Assign or increase the driver budget first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowBudgetAlert(false)}>
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
          <div className="flex gap-2">
            <DownloadButton
              module="trips"
              data={trips}
              filters={filters}
            />
            <DownloadButton
              module="vehicle-trip-report"
              data={trips}
              filters={{ vehicleId: filters.vehicleId, fromDate: filters.fromDate, toDate: filters.toDate }}
              label="Download Vehicle Trip Report"
            />
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
    setUserBanks({});
                setIsBudgetCollapsed(true);
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
              {/* Driver Budget Assignment (Top of Trip Form) */}
              <Card className="mb-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Driver Budget</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBudgetCollapsed(prev => !prev)}
                    aria-label={isBudgetCollapsed ? "Expand driver budget" : "Collapse driver budget"}
                  >
                    {isBudgetCollapsed ? (
                      <><ChevronDown className="w-4 h-4 mr-1" /> Expand</>
                    ) : (
                      <><ChevronUp className="w-4 h-4 mr-1" /> Collapse</>
                    )}
                  </Button>
                </CardHeader>
                {!isBudgetCollapsed && (
                <CardContent>
                  {!getStringValue(formData.driverId) && (
                    <div className="text-sm text-muted-foreground mb-2">
                      Select a driver to assign budget.
                    </div>
                  )}

                  {/* Driver select for budget assignment */}
                  <div className="mb-4">
                    <Label>Driver</Label>
                    <Select
                      value={budgetForm.driverId || getStringValue(formData.driverId)}
                      onValueChange={(v) => handleBudgetDriverSelect(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          {drivers.map((d: any) => (
                            <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget info for selected driver in the card */}
                  { (budgetForm.driverId || getStringValue(formData.driverId)) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Remaining Budget</div>
                        <div className="font-medium">
                          {formatCurrency(Number(budgetSelectedDriverBudget?.remainingBudgetAmount || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Last Allocation Date</div>
                        <div className="font-medium">
                          {budgetSelectedDriverBudget?.date ? formatDate(budgetSelectedDriverBudget.date) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Carry-Forward Note</div>
                        <div className="text-sm">
                          {Number(budgetSelectedDriverBudget?.remainingBudgetAmount || 0) > 0
                            ? `Carry-forward ${formatCurrency(Number(budgetSelectedDriverBudget?.remainingBudgetAmount || 0))} will be added automatically`
                            : "No previous budget to carry-forward"}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>App User</Label>
                      <Select
                        value={budgetForm.appUserId}
                        onValueChange={(v) => setBudgetForm(prev => ({ ...prev, appUserId: v, bankId: "" }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select app user" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            {appUsers.map((u: any) => (
                              <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bank Account</Label>
                      <Select
                        value={budgetForm.bankId}
                        onValueChange={(v) => setBudgetForm(prev => ({ ...prev, bankId: v }))}
                        disabled={!budgetForm.appUserId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            {budgetBankOptions.map((b: any) => (
                              <SelectItem key={b._id} value={b._id}>
                                {b.bankName} - {b.accountNumber}
                              </SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Payment Type</Label>
                      <Select
                        value={budgetForm.paymentType}
                        onValueChange={(v) => setBudgetForm(prev => ({ ...prev, paymentType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            {paymentTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={budgetForm.date}
                        onChange={(e) => setBudgetForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Daily Budget Amount</Label>
                      <Input
                        type="number"
                        value={budgetForm.amount}
                        onChange={(e) => setBudgetForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder={
                          Number(budgetSelectedDriverBudget?.remainingBudgetAmount || 0) > 0
                            ? `Enter new amount (carry-forward ${formatCurrency(Number(budgetSelectedDriverBudget?.remainingBudgetAmount || 0))} will be added)`
                            : "Enter daily budget amount"
                        }
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={budgetForm.description}
                        onChange={(e) => setBudgetForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button type="button" onClick={handleAssignBudget} disabled={!budgetForm.driverId && !getStringValue(formData.driverId)}>
                      <Plus className="w-4 h-4 mr-2" /> Assign Budget
                    </Button>
                  </div>
                </CardContent>
                )}
              </Card>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Trip Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Removed top-level Trip Dates editor; dates are per-route now */}

                  {/* Trip-level status control removed; status handled per route */}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="driver">Driver</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewDriverInput(prev => ({ ...prev, open: true }))}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <Select
                      value={getStringValue(formData.driverId)}
                      onValueChange={handleDriverSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search..."
                            value={driverSearchQuery}
                            onChange={(e) => setDriverSearchQuery(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        {getStringValue(formData.driverId) && !drivers.find(d => d._id === getStringValue(formData.driverId)) && (
                          <SelectItem key={`fallback-driver-${getStringValue(formData.driverId)}`} value={getStringValue(formData.driverId)}>
                            {formData.driverName || getStringValue(formData.driverId)}
                          </SelectItem>
                        )}
                        {drivers
                          .filter((driver) => {
                            const q = driverSearchQuery.toLowerCase();
                            if (!q) return true;
                            return (driver.name || "").toLowerCase().includes(q);
                          })
                          .map((driver) => (
                            <SelectItem key={driver._id} value={driver._id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {newDriverInput.open && (
                      <div className="mt-2 p-2 border rounded space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input
                            placeholder="Driver Name"
                            value={newDriverInput.name}
                            onChange={(e) => setNewDriverInput(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <Input
                            placeholder="Mobile No"
                            value={newDriverInput.mobileNo}
                            onChange={(e) => setNewDriverInput(prev => ({ ...prev, mobileNo: e.target.value }))}
                          />
                          <Select
                            value={newDriverInput.status}
                            onValueChange={(value) => setNewDriverInput(prev => ({ ...prev, status: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="on-leave">On Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleCreateDriverInline}
                            disabled={newDriverInput.saving}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewDriverInput(prev => ({ ...prev, open: false }))}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="vehicle">Vehicle</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewVehicleInput(prev => ({ ...prev, open: true }))}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <Select
                      value={getStringValue(formData.vehicleId)}
                      onValueChange={handleVehicleSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search..."
                            value={vehicleSearchQuery}
                            onChange={(e) => setVehicleSearchQuery(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        {getStringValue(formData.vehicleId) && !vehicles.find(v => v._id === getStringValue(formData.vehicleId)) && (
                          <SelectItem key={`fallback-vehicle-${getStringValue(formData.vehicleId)}`} value={getStringValue(formData.vehicleId)}>
                            {formData.vehicleNumber || getStringValue(formData.vehicleId)}
                          </SelectItem>
                        )}
                        {vehicles
                          .filter((vehicle) => {
                            const q = vehicleSearchQuery.toLowerCase();
                            if (!q) return true;
                            const label = (vehicle.registrationNumber || vehicle.vehicleNumber || "").toLowerCase();
                            return label.includes(q);
                          })
                          .map((vehicle) => (
                            <SelectItem key={vehicle._id} value={vehicle._id}>
                              {vehicle.registrationNumber || vehicle.vehicleNumber}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  {vehicleStandbyDays !== null && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      Vehicle on standby: {vehicleStandbyDays} day{vehicleStandbyDays === 1 ? '' : 's'}
                    </div>
                  )}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsStandbyOpen(true);
                        setStandbyForm(prev => ({
                          ...prev,
                          vehicleId: getStringValue(formData.vehicleId) || prev.vehicleId,
                          driverId: getStringValue(formData.driverId) || prev.driverId
                        }));
                      }}
                    >
                      Set Vehicle Standby
                    </Button>
                  </div>
                  {newVehicleInput.open && (
                      <div className="mt-2 p-2 border rounded space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <Input
                            placeholder="Registration Number"
                            value={newVehicleInput.registrationNumber}
                            onChange={(e) => setNewVehicleInput(prev => ({ ...prev, registrationNumber: e.target.value }))}
                          />
                          <Select
                            value={newVehicleInput.vehicleType}
                            onValueChange={(value) => setNewVehicleInput(prev => ({ ...prev, vehicleType: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Vehicle Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="truck">Truck</SelectItem>
                              <SelectItem value="van">Van</SelectItem>
                              <SelectItem value="bus">Bus</SelectItem>
                              <SelectItem value="car">Car</SelectItem>
                              <SelectItem value="motorcycle">Motorcycle</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Vehicle Weight (kg)"
                            type="number"
                            value={newVehicleInput.vehicleWeight}
                            onChange={(e) => setNewVehicleInput(prev => ({ ...prev, vehicleWeight: Number(e.target.value) }))}
                          />
                          <Select
                            value={newVehicleInput.vehicleStatus}
                            onValueChange={(value) => setNewVehicleInput(prev => ({ ...prev, vehicleStatus: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="in-use">In Use</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="retired">Retired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!newVehicleInput.registrationNumber) {
                                toast.error("Enter registration number.");
                                return;
                              }
                              try {
                                setNewVehicleInput(prev => ({ ...prev, saving: true }));
                                const created = await dispatch(createVehicle({
                                  registrationNumber: newVehicleInput.registrationNumber,
                                  vehicleType: newVehicleInput.vehicleType,
                                  vehicleWeight: newVehicleInput.vehicleWeight,
                                  vehicleStatus: newVehicleInput.vehicleStatus,
                                }) as any).unwrap();
                                toast.success("Vehicle added!");
                                setNewVehicleInput({ registrationNumber: "", vehicleType: "truck", vehicleWeight: 0, vehicleStatus: "available", open: false, saving: false });
                                await handleVehicleSelect(created._id);
                              } catch (error: any) {
                                console.error("Failed to create vehicle:", error);
                                toast.error(error.message || "Failed to create vehicle");
                                setNewVehicleInput(prev => ({ ...prev, saving: false }));
                              }
                            }}
                            disabled={newVehicleInput.saving}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewVehicleInput(prev => ({ ...prev, open: false }))}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
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
  const availableFuelLiters = selectedVehicleFuelData
  ? (selectedVehicleFuelData.fuelQuantity || 0)
                          : 0;
                        if (selectedVehicleFuelData && fuelMetrics.tripFuelQuantity > availableFuelLiters) {
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
  const availableFuelLiters = selectedVehicleFuelData
  ? (selectedVehicleFuelData.fuelQuantity || 0)
                          : 0;
                        if (selectedVehicleFuelData && fuelMetrics.tripFuelQuantity > availableFuelLiters) {
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
  {(selectedVehicleFuelData.fuelQuantity || 0)} L
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
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                onClick={() => addRoute()}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Route
                              </Button>
                              <Button
                                type="button"
                                onClick={() => removeRoute(routeIndex)}
                                variant="outline"
                                size="sm"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Multi-location list per route */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium">Locations</Label>
                              <Button type="button" variant="outline" size="sm" onClick={() => addLocationEntry(routeIndex)}>
                                <Plus className="w-3 h-3 mr-1" />
                                Add Location
                              </Button>
                            </div>
                            {(() => {
                              const list = routeLocations[routeIndex] || [];
                              const rows: React.ReactNode[] = [];
                              for (let i = 0; i < list.length; i += 2) {
                                const leftIndex = i;
                                const rightIndex = i + 1;
                                const leftLoc = list[leftIndex];
                                const rightLoc = list[rightIndex];
                                rows.push(
                                  <div key={`row-${routeIndex}-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start mb-2">
                                    {/* Column A: From, To, Status */}
                                    <div className="space-y-1">
                                      <div>
                                        <Label className="text-xs">From</Label>
                                        <div className="flex items-end gap-1">
                                          <Select
                                            value={leftLoc?.from}
                                            onValueChange={(value) => updateLocationEntry(routeIndex, leftIndex, 'from', value)}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select from location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {/* Inline search inside dropdown */}
                                              <div className="p-2">
                                                <Input
                                                  placeholder="Search location..."
                                                  value={locationSearchQueries[`${routeIndex}-${leftIndex}-from`] || ''}
                                                  onChange={(e) =>
                                                    setLocationSearchQueries((prev) => ({
                                                      ...prev,
                                                      [`${routeIndex}-${leftIndex}-from`]: e.target.value,
                                                    }))
                                                  }
                                                  className="h-8"
                                                />
                                              </div>
                                              {locations
                                                .filter((l: any) => {
                                                  const q = (locationSearchQueries[`${routeIndex}-${leftIndex}-from`] || '').toLowerCase();
                                                  if (!q) return true;
                                                  return (l.locationName || '').toLowerCase().includes(q);
                                                })
                                                .map((l: any) => (
                                                  <SelectItem key={l._id} value={l.locationName}>{l.locationName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                          <Button type="button" variant="outline" size="sm" onClick={() => setNewFromLocationInput(`${routeIndex}-${leftIndex}`, 'open', true)}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        {newFromLocationInputs[`${routeIndex}-${leftIndex}`]?.open && (
                                          <div className="mt-2 p-2 border rounded">
                                            <div className="flex gap-2">
                                              <Input
                                                placeholder="Location Name"
                                                value={newFromLocationInputs[`${routeIndex}-${leftIndex}`]?.locationName || ''}
                                                onChange={(e) => setNewFromLocationInput(`${routeIndex}-${leftIndex}`, 'locationName', e.target.value)}
                                              />
                                              <Button type="button" onClick={() => handleCreateFromLocation(routeIndex, leftIndex)} disabled={newFromLocationInputs[`${routeIndex}-${leftIndex}`]?.saving}>Save</Button>
                                              <Button type="button" variant="outline" onClick={() => setNewFromLocationInput(`${routeIndex}-${leftIndex}`, 'open', false)}>Cancel</Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <Label className="text-xs">To</Label>
                                        <div className="flex items-end gap-1">
                                          <Select
                                            value={leftLoc?.to}
                                            onValueChange={(value) => updateLocationEntry(routeIndex, leftIndex, 'to', value)}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select to location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {/* Inline search inside dropdown */}
                                              <div className="p-2">
                                                <Input
                                                  placeholder="Search location..."
                                                  value={locationSearchQueries[`${routeIndex}-${leftIndex}-to`] || ''}
                                                  onChange={(e) =>
                                                    setLocationSearchQueries((prev) => ({
                                                      ...prev,
                                                      [`${routeIndex}-${leftIndex}-to`]: e.target.value,
                                                    }))
                                                  }
                                                  className="h-8"
                                                />
                                              </div>
                                              {locations
                                                .filter((l: any) => {
                                                  const q = (locationSearchQueries[`${routeIndex}-${leftIndex}-to`] || '').toLowerCase();
                                                  if (!q) return true;
                                                  return (l.locationName || '').toLowerCase().includes(q);
                                                })
                                                .map((l: any) => (
                                                  <SelectItem key={l._id} value={l.locationName}>{l.locationName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                          <Button type="button" variant="outline" size="sm" onClick={() => setNewToLocationInput(`${routeIndex}-${leftIndex}`, 'open', true)}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        {newToLocationInputs[`${routeIndex}-${leftIndex}`]?.open && (
                                          <div className="mt-2 p-2 border rounded">
                                            <div className="flex gap-2">
                                              <Input
                                                placeholder="Location Name"
                                                value={newToLocationInputs[`${routeIndex}-${leftIndex}`]?.locationName || ''}
                                                onChange={(e) => setNewToLocationInput(`${routeIndex}-${leftIndex}`, 'locationName', e.target.value)}
                                              />
                                              <Button type="button" onClick={() => handleCreateToLocation(routeIndex, leftIndex)} disabled={newToLocationInputs[`${routeIndex}-${leftIndex}`]?.saving}>Save</Button>
                                              <Button type="button" variant="outline" onClick={() => setNewToLocationInput(`${routeIndex}-${leftIndex}`, 'open', false)}>Cancel</Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <Label className="text-xs">Status</Label>
                                        <Select
                                          value={leftLoc?.status}
                                          onValueChange={(value) => updateLocationEntry(routeIndex, leftIndex, 'status', value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="empty">Empty</SelectItem>
                                            <SelectItem value="filled">Loaded</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          onClick={() => removeLocationEntry(routeIndex, leftIndex)}
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Column B: From, To, Status */}
                                    {rightLoc && (
                                      <div className="space-y-1">
                                        <div>
                                          <Label className="text-xs">From</Label>
                                          <div className="flex items-end gap-1">
                                          <Select
                                            value={rightLoc?.from}
                                            onValueChange={(value) => updateLocationEntry(routeIndex, rightIndex, 'from', value)}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select from location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {/* Inline search inside dropdown */}
                                              <div className="p-2">
                                                <Input
                                                  placeholder="Search location..."
                                                  value={locationSearchQueries[`${routeIndex}-${rightIndex}-from`] || ''}
                                                  onChange={(e) =>
                                                    setLocationSearchQueries((prev) => ({
                                                      ...prev,
                                                      [`${routeIndex}-${rightIndex}-from`]: e.target.value,
                                                    }))
                                                  }
                                                  className="h-8"
                                                />
                                              </div>
                                              {locations
                                                .filter((l: any) => {
                                                  const q = (locationSearchQueries[`${routeIndex}-${rightIndex}-from`] || '').toLowerCase();
                                                  if (!q) return true;
                                                  return (l.locationName || '').toLowerCase().includes(q);
                                                })
                                                .map((l: any) => (
                                                  <SelectItem key={l._id} value={l.locationName}>{l.locationName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                            <Button type="button" variant="outline" size="sm" onClick={() => setNewFromLocationInput(`${routeIndex}-${rightIndex}`, 'open', true)}>
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                          {newFromLocationInputs[`${routeIndex}-${rightIndex}`]?.open && (
                                            <div className="mt-2 p-2 border rounded">
                                              <div className="flex gap-2">
                                                <Input
                                                  placeholder="Location Name"
                                                  value={newFromLocationInputs[`${routeIndex}-${rightIndex}`]?.locationName || ''}
                                                  onChange={(e) => setNewFromLocationInput(`${routeIndex}-${rightIndex}`, 'locationName', e.target.value)}
                                                />
                                                <Button type="button" onClick={() => handleCreateFromLocation(routeIndex, rightIndex)} disabled={newFromLocationInputs[`${routeIndex}-${rightIndex}`]?.saving}>Save</Button>
                                                <Button type="button" variant="outline" onClick={() => setNewFromLocationInput(`${routeIndex}-${rightIndex}`, 'open', false)}>Cancel</Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-xs">To</Label>
                                          <div className="flex items-end gap-1">
                                          <Select
                                            value={rightLoc?.to}
                                            onValueChange={(value) => updateLocationEntry(routeIndex, rightIndex, 'to', value)}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select to location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {/* Inline search inside dropdown */}
                                              <div className="p-2">
                                                <Input
                                                  placeholder="Search location..."
                                                  value={locationSearchQueries[`${routeIndex}-${rightIndex}-to`] || ''}
                                                  onChange={(e) =>
                                                    setLocationSearchQueries((prev) => ({
                                                      ...prev,
                                                      [`${routeIndex}-${rightIndex}-to`]: e.target.value,
                                                    }))
                                                  }
                                                  className="h-8"
                                                />
                                              </div>
                                              {locations
                                                .filter((l: any) => {
                                                  const q = (locationSearchQueries[`${routeIndex}-${rightIndex}-to`] || '').toLowerCase();
                                                  if (!q) return true;
                                                  return (l.locationName || '').toLowerCase().includes(q);
                                                })
                                                .map((l: any) => (
                                                  <SelectItem key={l._id} value={l.locationName}>{l.locationName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                            <Button type="button" variant="outline" size="sm" onClick={() => setNewToLocationInput(`${routeIndex}-${rightIndex}`, 'open', true)}>
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                          {newToLocationInputs[`${routeIndex}-${rightIndex}`]?.open && (
                                            <div className="mt-2 p-2 border rounded">
                                              <div className="flex gap-2">
                                                <Input
                                                  placeholder="Location Name"
                                                  value={newToLocationInputs[`${routeIndex}-${rightIndex}`]?.locationName || ''}
                                                  onChange={(e) => setNewToLocationInput(`${routeIndex}-${rightIndex}`, 'locationName', e.target.value)}
                                                />
                                                <Button type="button" onClick={() => handleCreateToLocation(routeIndex, rightIndex)} disabled={newToLocationInputs[`${routeIndex}-${rightIndex}`]?.saving}>Save</Button>
                                                <Button type="button" variant="outline" onClick={() => setNewToLocationInput(`${routeIndex}-${rightIndex}`, 'open', false)}>Cancel</Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-xs">Status</Label>
                                          <Select
                                            value={rightLoc?.status}
                                            onValueChange={(value) => updateLocationEntry(routeIndex, rightIndex, 'status', value)}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="empty">Empty</SelectItem>
                                              <SelectItem value="filled">Loaded</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex justify-end">
                                          <Button
                                            type="button"
                                            onClick={() => removeLocationEntry(routeIndex, rightIndex)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return rows;
                            })()}
                            {(!routeLocations[routeIndex] || routeLocations[routeIndex].length === 0) && (
                              <p className="text-xs text-gray-500">No locations added for this route.</p>
                            )}
                          </div>
                          <Separator className="my-2" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label>Customer</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewCustomerInput(routeIndex, "open", true)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                              <Select
                                value={getStringValue(route.customerId)}
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
                                  {/* Inline search inside dropdown */}
                                  <div className="p-2">
                                    <Input
                                      placeholder="Search customer..."
                                      value={customerSearchQueries[routeIndex] || ""}
                                      onChange={(e) =>
                                        setCustomerSearchQueries((prev) => ({
                                          ...prev,
                                          [routeIndex]: e.target.value,
                                        }))
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                  {customers
                                    .filter((customer) => {
                                      const q = (customerSearchQueries[routeIndex] || "").toLowerCase();
                                      if (!q) return true;
                                      return (
                                        customer.companyName.toLowerCase().includes(q) ||
                                        customer.customerName.toLowerCase().includes(q) ||
                                        customer.mobileNo.toLowerCase().includes(q)
                                      );
                                    })
                                    .map((customer) => (
                                     <SelectItem
                                       key={customer._id}
                                       value={customer._id}
                                     >
                                       {customer.companyName}
                                     </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {newCustomerInputs[routeIndex]?.open && (
                                <div className="mt-2 p-2 border rounded space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input
                                      placeholder="Customer Name"
                                      value={newCustomerInputs[routeIndex]?.customerName || ""}
                                      onChange={(e) => setNewCustomerInput(routeIndex, "customerName", e.target.value)}
                                    />
                                    <Input
                                      placeholder="Company Name"
                                      value={newCustomerInputs[routeIndex]?.companyName || ""}
                                      onChange={(e) => setNewCustomerInput(routeIndex, "companyName", e.target.value)}
                                    />
                                    <Input
                                      placeholder="Mobile No"
                                      value={newCustomerInputs[routeIndex]?.mobileNo || ""}
                                      onChange={(e) => setNewCustomerInput(routeIndex, "mobileNo", e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      onClick={() => handleCreateCustomer(routeIndex)}
                                      disabled={newCustomerInputs[routeIndex]?.saving}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setNewCustomerInput(routeIndex, "open", false)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <Label>App User</Label>
                              <Select
                                value={getStringValue(route.userId)}
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
                                value={getStringValue(route.bankId)}
                                onValueChange={(value) => {
                                  const bank = (userBanks[routeIndex] || []).find(
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
                                  {/* Inline search for banks by account name only */}
                                  <div className="p-2">
                                    <Label className="text-xs">Search Bank</Label>
                                    <Input
                                      value={bankSearchQueries[routeIndex] || ""}
                                      onChange={(e) => setBankSearchQueries((prev) => ({ ...prev, [routeIndex]: e.target.value }))}
                                      placeholder="Type account name..."
                                    />
                                  </div>
                                  {(() => {
                                    const q = (bankSearchQueries[routeIndex] || "").toLowerCase().trim();
                                    const banksList = ((userBanks[routeIndex] || [])).filter((b: any) =>
                                      String(b.bankName || '').toLowerCase().includes(q)
                                    );
                                    return (
                                      <>
                                        {/* Fallback option to show existing selection when options are not loaded */}
                                        {route.bankId && !banksList.find((b: any) => b._id === getStringValue(route.bankId)) && (
                                          <SelectItem key={`fallback-bank-${getStringValue(route.bankId)}`} value={getStringValue(route.bankId)}>
                                            {route.bankName || 'Selected Bank'}
                                          </SelectItem>
                                        )}
                                        {banksList.map((bank: any) => (
                                          <SelectItem key={bank._id} value={bank._id}>
                                            {`${bank.bankName} • ****${(bank.accountNumber || '').slice(-4)} • Balance: ${Number(bank.balance ?? 0).toLocaleString()}`}
                                          </SelectItem>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label>Product Name</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewProductInput(routeIndex, "open", true)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </Button>
                              </div>
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
                                  {/* Fallback option to show existing selection when products are not loaded */}
                                  {route.productName && !customerProducts.find((p) => p.productName === route.productName) && (
                                    <SelectItem key={`fallback-product-${route.productName}`} value={route.productName}>
                                      {route.productName}
                                    </SelectItem>
                                  )}
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
                              {newProductInputs[routeIndex]?.open && (
                                <div className="mt-2 p-2 border rounded space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <Input
                                      placeholder="Product Name"
                                      value={newProductInputs[routeIndex]?.productName || ""}
                                      onChange={(e) => setNewProductInput(routeIndex, "productName", e.target.value)}
                                    />
                                    <Input
                                      placeholder="Product Rate"
                                      type="number"
                                      value={newProductInputs[routeIndex]?.productRate ?? 0}
                                      onChange={(e) => setNewProductInput(routeIndex, "productRate", Number(e.target.value))}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      onClick={() => handleCreateProduct(routeIndex)}
                                      disabled={newProductInputs[routeIndex]?.saving}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setNewProductInput(routeIndex, "open", false)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
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
                                  // Mirror expense quantities to the route weight and recompute totals
                                  setFormData((prev) => ({
                                    ...prev,
                                    routeWiseExpenseBreakdown: (prev.routeWiseExpenseBreakdown || []).map((r, i) => {
                                      if (i !== routeIndex) return r;
                                      const expenses = (r.expenses || []).map((exp) => {
                                        const amount = Number(exp.amount || 0);
                                        const qty = Number(weight || 0);
                                        return {
                                          ...exp,
                                          quantity: qty,
                                          total: amount * qty,
                                        };
                                      });
                                      const totalExpense = expenses.reduce((sum, exp) => sum + (Number(exp.total) || 0), 0);
                                      return { ...r, expenses, totalExpense };
                                    }),
                                  }));
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
                              <Label>Advance Amount</Label>
                              <Input
                                type="number"
                                value={Number(route.advanceAmount || 0)}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  updateRoute(routeIndex, "advanceAmount", isNaN(val) ? 0 : val);
                                }}
                                placeholder="Advance paid by customer"
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
                            <div>
                              <Label>Route Status</Label>
                              <Select
                                value={route.routeStatus || 'In Progress'}
                                onValueChange={(value) =>
                                  updateRoute(routeIndex, 'routeStatus', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select route status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Route Dates */}
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-2">
                              <Label>Route Dates</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const current = route.dates || [];
                                  let nextDate: Date;
                                  if (current.length > 0) {
                                    const last = new Date(current[current.length - 1] as Date);
                                    last.setDate(last.getDate() + 1);
                                    nextDate = last;
                                  } else {
                                    nextDate = new Date();
                                  }
                                  updateRoute(routeIndex, 'dates', [...current, nextDate]);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Date
                              </Button>
                            </div>
                            {/** Helper to format date as local YYYY-MM-DD for input value */}
                            {/** Avoid timezone shifting from toISOString() */}
                            {/** Using inline function to keep scope local to this block */}
                            {(() => {
                              const toDateInputValue = (dt: Date) => {
                                const y = dt.getFullYear();
                                const m = String(dt.getMonth() + 1).padStart(2, '0');
                                const d = String(dt.getDate()).padStart(2, '0');
                                return `${y}-${m}-${d}`;
                              };
                              // Compute next date after the last standby date (if any)
                              const parseYmd = (s: string) => {
                                const [y, m, d] = s.split('-').map(Number);
                                return new Date(y, (m || 1) - 1, d || 1);
                              };
                              const lastStandbyDate: Date | null = (() => {
                                const sds = (standbyForm?.dates || []).filter(Boolean);
                                if (sds.length === 0) return null;
                                const ds = sds.map(parseYmd);
                                ds.sort((a, b) => a.getTime() - b.getTime());
                                return ds[ds.length - 1] || null;
                              })();
                              const nextAfterLastStandby: Date | null = (() => {
                                if (!lastStandbyDate) return null;
                                const nd = new Date(lastStandbyDate);
                                nd.setDate(nd.getDate() + 1);
                                return nd;
                              })();
                              return (
                                <>
                                  {(route.dates || []).map((d, dIndex) => (
                                    <div key={dIndex} className="flex items-center gap-2 mb-2">
                                      <Input
                                        type="date"
                                        value={d ? toDateInputValue(new Date(d)) : ''}
                                        onChange={(e) => {
                                          const current = [...(route.dates || [])];
                                          current[dIndex] = new Date(e.target.value);
                                          updateRoute(routeIndex, 'dates', current);
                                        }}
                                      />
                                      {(route.dates || []).length > 1 && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const filtered = (route.dates || []).filter((_, i) => i !== dIndex);
                                            updateRoute(routeIndex, 'dates', filtered);
                                          }}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  {(!route.dates || route.dates.length === 0) && (
                                    <Input
                                      type="date"
                                      onChange={(e) => {
                                        updateRoute(routeIndex, 'dates', [new Date(e.target.value)]);
                                      }}
                                    />
                                  )}
                                  {nextAfterLastStandby && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Next after last standby: {toDateInputValue(nextAfterLastStandby)}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
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

                            {/* Search and Add Category tools */}
                            <div className="flex flex-wrap gap-2 items-end mb-3">
                              <div className="w-40">
                                <Label className="text-xs">Search Category</Label>
                                <Input
                                  value={categorySearchQuery}
                                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                                  placeholder="Type to search..."
                                />
                              </div>
                              <div className="w-40">
                                <Label className="text-xs">New Category</Label>
                                <Input
                                  value={(newCategoryInputs[routeIndex]?.name) || ""}
                                  onChange={(e) => setNewCategoryInput(routeIndex, "name", e.target.value)}
                                  placeholder="Category name"
                                />
                              </div>
                              <div className="w-36">
                                <Label className="text-xs">Rate</Label>
                                <Input
                                  type="number"
                                  value={Number(newCategoryInputs[routeIndex]?.rate || 0)}
                                  onChange={(e) => setNewCategoryInput(routeIndex, "rate", Number(e.target.value))}
                                  placeholder="Rate"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addCategoryForRoute(routeIndex)}
                              >
                                Add Category
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
                                      {/* Fallback option to show existing selection when categories are not loaded */}
                                      {expense.category && !filteredCategories.includes(expense.category) && (
                                        <SelectItem key={`fallback-category-${expense.category}`} value={expense.category}>
                                          {expense.category}
                                        </SelectItem>
                                      )}
                                      {filteredCategories.map((category) => (
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
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Trip Diesel Cost:
                          </span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(formData.tripDiselCost || 0)}
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
                                ) - (formData.tripDiselCost || 0)
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
          {/* Standby Sheet */}
          <Sheet open={isStandbyOpen} onOpenChange={setIsStandbyOpen}>
            <SheetContent className="w-[520px] sm:w-[600px]">
              <SheetHeader>
                <SheetTitle>Set Vehicle Standby</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Vehicle</Label>
                  <Select value={standbyForm.vehicleId} onValueChange={(value) => setStandbyForm(prev => ({ ...prev, vehicleId: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle._id} value={vehicle._id}>
                          {vehicle.registrationNumber || vehicle.vehicleNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {standbyLatestTripInfo && (
                    <div className="text-xs text-muted-foreground mt-2">
                      <div>Previous location: {standbyLatestTripInfo.lastToLocation || '-'}</div>
                      <div>Last date: {standbyLatestTripInfo.lastDate || '-'}</div>
                      <div>Next available date: {standbyLatestTripInfo.nextDate || '-'}</div>
                      {typeof standbyLatestTripInfo.standbyDays === 'number' && (
                        <div>Standby duration: {standbyLatestTripInfo.standbyDays} day{standbyLatestTripInfo.standbyDays === 1 ? '' : 's'}</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Driver</Label>
                  <Select value={standbyForm.driverId} onValueChange={(value) => setStandbyForm(prev => ({ ...prev, driverId: value }))}>
                    <SelectTrigger className="mt-1">
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
                  <Label>Attendance</Label>
                  <Select value={standbyForm.attendanceStatus} onValueChange={(value) => setStandbyForm(prev => ({ ...prev, attendanceStatus: value as any }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Present">Present</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Add Standby Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="date" id="standby-date-input" />
                    <Button variant="secondary" onClick={() => {
                      const el = document.getElementById('standby-date-input') as HTMLInputElement | null;
                      addStandbyDate(el?.value || '');
                    }}>Add</Button>
                  </div>
                  {standbyForm.dates && standbyForm.dates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {standbyForm.dates.map(d => (
                        <Badge key={d} variant="secondary" className="flex items-center gap-2">
                          {d}
                          <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => removeStandbyDate(d)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Textarea placeholder="Optional" value={standbyForm.remarks} onChange={(e) => setStandbyForm(prev => ({ ...prev, remarks: e.target.value }))} />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsStandbyOpen(false)}>Cancel</Button>
                  <Button disabled={standbyForm.saving} onClick={submitStandby}>{standbyForm.saving ? 'Saving...' : 'Save Standby'}</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          </div>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              <Button size="sm" onClick={() => dispatch(fetchTrips(filters))}>
                Apply Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    <div className="p-2">
                      <Input
                        placeholder="Search..."
                        value={driverFilterSearchQuery}
                        onChange={(e) => setDriverFilterSearchQuery(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers
                      .filter((driver) => {
                        const q = driverFilterSearchQuery.toLowerCase();
                        if (!q) return true;
                        return (driver.name || "").toLowerCase().includes(q);
                      })
                      .map((driver) => (
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
                    <div className="p-2">
                      <Input
                        placeholder="Search..."
                        value={vehicleFilterSearchQuery}
                        onChange={(e) => setVehicleFilterSearchQuery(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    {vehicles
                      .filter((vehicle) => {
                        const q = vehicleFilterSearchQuery.toLowerCase();
                        if (!q) return true;
                        const label = (vehicle.registrationNumber || vehicle.vehicleNumber || "").toLowerCase();
                        return label.includes(q);
                      })
                      .map((vehicle) => (
                        <SelectItem key={vehicle._id} value={vehicle._id}>
                          {vehicle.vehicleNumber || vehicle.registrationNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.fromDate || ""}
                  onChange={(e) => dispatch(setFilters({ fromDate: e.target.value }))}
                />
              </div>

              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.toDate || ""}
                  onChange={(e) => dispatch(setFilters({ toDate: e.target.value }))}
                />
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
                        <TableCell>
                          {trip.routeWiseExpenseBreakdown?.[0]?.dates?.[0]
                            ? formatDate(trip.routeWiseExpenseBreakdown[0].dates[0])
                            : (trip.date?.[0] ? formatDate(trip.date[0]) : '—')}
                        </TableCell>
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
            {trips.length > 0 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleLimitChange}
              />
            )}
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
                          {viewingTrip.routeWiseExpenseBreakdown?.[0]?.dates?.[0]
                            ? formatDate(viewingTrip.routeWiseExpenseBreakdown[0].dates[0])
                            : (viewingTrip.date?.[0] ? formatDate(viewingTrip.date[0]) : '—')}
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
                              <Label>Route Dates</Label>
                              <p className="font-semibold">
                                {(route.dates && route.dates.length > 0)
                                  ? route.dates.map((d) => formatDate(d)).join(', ')
                                  : '—'}
                              </p>
                            </div>
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
    </ProtectedRoute>
  );
};

export default TripsPage;