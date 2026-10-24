import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-600 text-white shadow hover:bg-brand-700",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive:
          "border-transparent bg-rose-100 text-rose-800 border-rose-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 border-emerald-200",
        warning:
          "border-transparent bg-amber-100 text-amber-800 border-amber-200",
        outline:
          "text-slate-700 border-slate-300",
        roleAdmin:
          "bg-purple-100 text-purple-800 border-purple-200 font-semibold",
        roleHr:
          "bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold",
        roleEmployee:
          "bg-blue-100 text-blue-800 border-blue-200 font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
