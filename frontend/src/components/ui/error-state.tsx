import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  message = "An error occurred while connecting to the HCM Lite service.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-base font-semibold text-rose-900">{title}</h4>
      <p className="mt-1 max-w-sm text-sm text-rose-700">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Retry Connection
        </Button>
      )}
    </div>
  );
}
