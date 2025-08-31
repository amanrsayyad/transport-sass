"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { 
  fetchFuelTrackings,
  createFuelTracking,
  clearError,
  FuelTrackingCreateData
} from '@/lib/redux/slices/operationsSlice';
import { fetchBanks } from '@/lib/redux/slices/bankSlice';
import { fetchAppUsers } from '@/lib/redux/slices/appUserSlice';
import { fetchVehicles } from '@/lib/redux/slices/vehicleSlice';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Fuel, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface FuelTrackingFormData {
  appUserId: string;
  bankId: string;
  vehicleId: string;
  startKm: number;
  endKm: number;
  fuelQuantity: number;
  fuelRate: number;
  date: string;
  description: string;
  paymentType: string;
}

const FuelTrackingManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { fuelTrackings, loading, error } = useSelector((state: RootState) => state.operations);
  const { banks } = useSelector((state: RootState) => state.banks);
  const { appUsers } = useSelector((state: RootState) => state.appUsers);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [carryForwardFuel, setCarryForwardFuel] = useState(0);
  const [selectedVehicleData, setSelectedVehicleData] = useState<any>(null);
  const [latestTripData, setLatestTripData] = useState<any>(null);
  const [latestFuelRecord, setLatestFuelRecord] = useState<any>(null);
  const [formData, setFormData] = useState<FuelTrackingFormData>({
    appUserId: '',
    bankId: '',
    vehicleId: '',
    startKm: 0,
    endKm: 0,
    fuelQuantity: 0,
    fuelRate: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentType: '',
  });

  // Payment types array
  const paymentTypes = ['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card', 'Cheque'];

  useEffect(() => {
    dispatch(fetchFuelTrackings());
    dispatch(fetchBanks());
    dispatch(fetchAppUsers());
    dispatch(fetchVehicles());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['startKm', 'endKm', 'fuelQuantity', 'fuelRate'].includes(name) 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSelectChange = async (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If vehicle is selected, fetch both trip end KM and carry-forward fuel quantity
    if (name === 'vehicleId' && value) {
      try {
        // Find selected vehicle details
        const selectedVehicle = vehicles.find(v => v._id === value);
        setSelectedVehicleData(selectedVehicle);
        
        // Fetch latest trip record to get end KM for start KM field
        const tripResponse = await fetch(`/api/trips/latest/${value}`);
        let startKm = 0;
        let latestTrip = null;
        
        if (tripResponse.ok) {
          latestTrip = await tripResponse.json();
          startKm = latestTrip.endKm || 0;
        }
        setLatestTripData(latestTrip);
        
        // Fetch latest fuel tracking record for carry-forward fuel
        const fuelResponse = await fetch(`/api/fuel-tracking/latest/${value}`);
        let remainingFuel = 0;
        let fuelRecord = null;
        
        if (fuelResponse.ok) {
          fuelRecord = await fuelResponse.json();
          remainingFuel = fuelRecord.remainingFuelQuantity || 0;
        }
        
        // Update form data with start KM from latest trip and fuel quantity with carry forward fuel
        const fuelQuantityValue = remainingFuel === 0 && fuelRecord ? fuelRecord.fuelQuantity : remainingFuel;
        setFormData(prev => ({ ...prev, startKm, fuelQuantity: fuelQuantityValue }));
        setCarryForwardFuel(remainingFuel);
        setLatestFuelRecord(fuelRecord);
        
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
        setCarryForwardFuel(0);
        setSelectedVehicleData(null);
        setLatestTripData(null);
        setLatestFuelRecord(null);
      }
    } else if (name === 'vehicleId' && !value) {
      // Reset vehicle-related data when no vehicle is selected
      setSelectedVehicleData(null);
      setLatestTripData(null);
      setLatestFuelRecord(null);
      setCarryForwardFuel(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appUserId || !formData.bankId || !formData.vehicleId || !formData.paymentType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.endKm <= formData.startKm) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    if (formData.fuelQuantity <= 0 || formData.fuelRate <= 0) {
      toast.error('Fuel quantity and rate must be greater than 0');
      return;
    }

    const totalAmount = formData.fuelQuantity * formData.fuelRate;
    const distance = formData.endKm - formData.startKm;
    const truckAverage = distance / formData.fuelQuantity;
    const selectedBank = banks.find(bank => bank._id === formData.bankId);
    
    if (selectedBank && totalAmount > selectedBank.balance) {
      toast.error('Insufficient bank balance for this fuel expense');
      return;
    }

    const fuelTrackingData: FuelTrackingCreateData = {
      appUserId: formData.appUserId,
      bankId: formData.bankId,
      vehicleId: formData.vehicleId,
      startKm: formData.startKm,
      endKm: formData.endKm,
      fuelQuantity: formData.fuelQuantity,
      fuelRate: formData.fuelRate,
      totalAmount,
      truckAverage,
      date: formData.date,
      description: formData.description,
      paymentType: formData.paymentType,
    };

    try {
      await dispatch(createFuelTracking(fuelTrackingData)).unwrap();
      toast.success('Fuel tracking record created successfully');
      setIsDialogOpen(false);
      resetForm();
      // Refresh data
      dispatch(fetchFuelTrackings());
      dispatch(fetchBanks());
    } catch (error: any) {
      toast.error(error || 'Failed to create fuel tracking record');
    }
  };

  const resetForm = () => {
    setFormData({
      appUserId: '',
      bankId: '',
      vehicleId: '',
      startKm: 0,
      endKm: 0,
      fuelQuantity: 0,
      fuelRate: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentType: '',
    });
    setCarryForwardFuel(0);
    setSelectedVehicleData(null);
    setLatestTripData(null);
    setLatestFuelRecord(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getActiveBanks = () => {
    return banks.filter(bank => bank.isActive);
  };

  const getUserBanks = (userId: string) => {
    return banks.filter(bank => bank.isActive && bank.appUserId._id === userId);
  };

  const getSelectedBank = () => {
    return banks.find(bank => bank._id === formData.bankId);
  };

  const calculateTotalAmount = () => {
    return formData.fuelQuantity * formData.fuelRate;
  };

  const calculateDistance = () => {
    return formData.endKm - formData.startKm;
  };

  const calculateEstimatedAverage = () => {
    const distance = calculateDistance();
    return distance > 0 && formData.fuelQuantity > 0 
      ? (distance / formData.fuelQuantity).toFixed(2) 
      : '0';
  };

  const totalFuelExpense = fuelTrackings.reduce((sum, fuel) => sum + fuel.totalAmount, 0);
  const totalFuelQuantity = fuelTrackings.reduce((sum, fuel) => sum + fuel.fuelQuantity, 0);
  const uniqueVehicles = new Set(fuelTrackings.map(fuel => fuel.vehicleId._id)).size;
  const averageFuelRate = fuelTrackings.length > 0 
    ? fuelTrackings.reduce((sum, fuel) => sum + fuel.fuelRate, 0) / fuelTrackings.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Fuel Tracking Management</h1>
            <p className="text-gray-600">
              Track fuel expenses and vehicle efficiency
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              resetForm();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Fuel Record
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Fuel Tracking Record</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="appUserId">App User *</Label>
                    <Select
                      value={formData.appUserId}
                      onValueChange={(value) =>
                        handleSelectChange("appUserId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select app user" />
                      </SelectTrigger>
                      <SelectContent>
                        {appUsers.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bankId">Bank Account *</Label>
                    <Select
                      value={formData.bankId}
                      onValueChange={(value) =>
                        handleSelectChange("bankId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {(formData.appUserId
                          ? getUserBanks(formData.appUserId)
                          : getActiveBanks()
                        ).map((bank) => (
                          <SelectItem key={bank._id} value={bank._id}>
                            {bank.bankName} - {bank.accountNumber}
                            <span className="text-green-600 ml-2">
                              ({formatCurrency(bank.balance)})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="vehicleId">Vehicle *</Label>
                  <Select
                    value={formData.vehicleId}
                    onValueChange={(value) =>
                      handleSelectChange("vehicleId", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle._id} value={vehicle._id}>
                          {vehicle.registrationNumber}
                          <span className="text-sm text-gray-500 ml-2">
                            ({vehicle.vehicleType} {vehicle.vehicleWeight})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Display fetched vehicle data */}
                  {selectedVehicleData && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      {latestFuelRecord && (
                        <div>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="font-medium">KM Range:</span> 
                              <span className="ml-1">{latestFuelRecord.startKm} - {latestFuelRecord.endKm} km</span>
                            </div>
                            <div>
                              <span className="font-medium">Fuel Quantity:</span> 
                              <span className="ml-1">{latestFuelRecord.fuelQuantity?.toFixed(2)}L</span>
                            </div>
                            <div>
                               <span className="font-medium">Remaining Fuel:</span> 
                               <span className={`font-bold ml-1 ${carryForwardFuel > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                 {carryForwardFuel === 0 ? latestFuelRecord.fuelQuantity?.toFixed(2) : carryForwardFuel.toFixed(2)}L
                               </span>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startKm">Start KM *</Label>
                    <Input
                      id="startKm"
                      name="startKm"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.startKm}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                    {latestTripData && formData.startKm > 0 && (
                      <p className="text-xs mt-1 text-blue-600">
                        ✓ Auto-filled from latest trip end KM
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endKm">End KM *</Label>
                    <Input
                      id="endKm"
                      name="endKm"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.endKm}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                    {formData.startKm > 0 && formData.endKm > 0 && (
                      <p
                        className={`text-sm mt-1 ${
                          formData.endKm <= formData.startKm
                            ? "text-red-500"
                            : "text-green-600"
                        }`}
                      >
                        Distance: {calculateDistance()} km
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fuelQuantity">Fuel Quantity (L) *</Label>
                    <Input
                      id="fuelQuantity"
                      name="fuelQuantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.fuelQuantity}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      required
                    />
                    {carryForwardFuel > 0 && (
                      <p className="text-sm mt-1 text-blue-600">
                        Carry Forward: +{carryForwardFuel.toFixed(2)}L
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fuelRate">Fuel Rate (per L) *</Label>
                    <Input
                      id="fuelRate"
                      name="fuelRate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.fuelRate}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {formData.fuelQuantity > 0 && formData.fuelRate > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Amount:</span>
                        <span className="ml-2 text-red-600 font-bold">
                          {formatCurrency(calculateTotalAmount())}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Est. Average:</span>
                        <span className="ml-2 text-blue-600 font-bold">
                          {calculateEstimatedAverage()} km/L
                        </span>
                      </div>
                    </div>
                    {formData.bankId &&
                      calculateTotalAmount() >
                        (getSelectedBank()?.balance || 0) && (
                        <p className="text-red-500 text-sm mt-2">
                          ⚠️ Insufficient bank balance
                        </p>
                      )}
                  </div>
                )}

                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value) => handleSelectChange('paymentType', value)}
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

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      formData.endKm <= formData.startKm ||
                      (!!formData.bankId &&
                        calculateTotalAmount() >
                          (getSelectedBank()?.balance || 0))
                    }
                  >
                    {loading ? "Adding..." : "Add Record"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Records
              </CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fuelTrackings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Fuel Expense
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalFuelExpense)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Fuel (L)
              </CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalFuelQuantity.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Fuel Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(averageFuelRate)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fuel Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Tracking Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                Loading fuel tracking records...
              </div>
            ) : fuelTrackings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No fuel tracking records found. Add your first fuel record.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App User</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelTrackings.map((fuel) => (
                    <TableRow key={fuel._id}>
                      <TableCell>
                        <div className="font-medium">{fuel.appUserId.name}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {fuel.bankId.bankName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fuel.bankId.accountNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {fuel.vehicleId.vehicleNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fuel.vehicleId.make} {fuel.vehicleId.model}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {(fuel.endKm - fuel.startKm).toFixed(1)} km
                          </div>
                          <div className="text-sm text-gray-500">
                            {fuel.startKm} → {fuel.endKm}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {fuel.fuelQuantity.toFixed(2)} L
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(fuel.fuelRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">
                          {formatCurrency(fuel.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {fuel.truckAverage.toFixed(2)} km/L
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(fuel.date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FuelTrackingManagement;