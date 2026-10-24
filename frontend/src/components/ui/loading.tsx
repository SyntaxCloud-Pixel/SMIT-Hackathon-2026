import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-7 w-7",
    lg: "h-11 w-11",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-slate-500",
        className
      )}
    >
      <Loader2
        className={cn("animate-spin text-brand-600", sizeClasses[size])}
      />
      {text && <p className="mt-3 text-sm font-medium">{text}</p>}
    </div>
  );
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      {...props}
    />
  );
}
