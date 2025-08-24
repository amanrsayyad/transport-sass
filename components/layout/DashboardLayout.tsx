"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { MaintenanceNotification } from "@/components/MaintenanceNotification";
import { MaintenanceNotificationBell } from "@/components/MaintenanceNotificationBell";
import { MaintenanceMonitor } from "@/components/MaintenanceMonitor";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1">
            <h1 className="font-semibold">Transport Management System</h1>
          </div>
          <MaintenanceNotificationBell />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        <MaintenanceNotification />
        {/* Background maintenance monitoring service */}
        <MaintenanceMonitor intervalMs={30000} enabled={true} />
      </main>
    </SidebarProvider>
  );
}
