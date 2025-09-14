"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "react-hot-toast";

interface DownloadButtonProps {
  module: string;
  data?: any[];
  filters?: Record<string, any>;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  module,
  data = [],
  filters = {},
  className = "",
  variant = "outline",
  size = "sm",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: "pdf" | "excel") => {
    if (data.length === 0) {
      toast.error("No data available to download");
      return;
    }

    setIsDownloading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        module,
        format,
        ...filters,
      });

      // Make API request
      const response = await fetch(`/api/download/${module}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Set filename based on format and module
      const timestamp = new Date().toISOString().split("T")[0];
      const extension = format === "pdf" ? "pdf" : "xlsx";
      link.download = `${module}-data-${timestamp}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${module} data downloaded successfully!`);
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download data");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isDownloading || data.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("pdf")}>
          <FileText className="w-4 h-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("excel")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DownloadButton;