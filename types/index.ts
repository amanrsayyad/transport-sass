export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "driver";
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  type: "bus" | "truck" | "van" | "car";
  status: "available" | "in-use" | "maintenance" | "retired";
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: "available" | "assigned" | "on-leave";
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  _id: string;
  name: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedDuration: number;
  stops: string[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  vehicle: string | Vehicle;
  driver: string | Driver;
  route: string | Route;
  departureTime: Date;
  arrivalTime: Date;
  passengers: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}
