"use client";

import { ReactNode } from "react";
import { Eye } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ViewField {
  label: string;
  value: string | number;
  type?: "text" | "badge" | "date";
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  clickable?: boolean;
  onClick?: () => void;
}

interface ViewDialogProps {
  trigger?: ReactNode;
  title: string;
  description: string;
  fields: ViewField[];
}

export function ViewDialog({
  trigger,
  title,
  description,
  fields,
}: ViewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <button className="p-2 hover:bg-gray-100 rounded">
            <Eye className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b last:border-b-0"
            >
              <span className="font-medium text-sm text-gray-600">
                {field.label}:
              </span>
              <div>
                {field.type === "badge" ? (
                  <Badge variant={field.badgeVariant || "default"}>
                    {field.value}
                  </Badge>
                ) : field.type === "date" ? (
                  <span className="text-sm">
                    {new Date(field.value).toLocaleDateString()}
                  </span>
                ) : field.clickable ? (
                  <button 
                    onClick={field.onClick} 
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {field.value}
                  </button>
                ) : (
                  <span className="text-sm font-medium">{field.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
