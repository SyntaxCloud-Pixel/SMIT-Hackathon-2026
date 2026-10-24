import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-brand-600 mb-4 shadow-sm">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The requested screen does not exist or you may not have permission to view it.
      </p>
      <Link to="/" className="mt-6">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
}
