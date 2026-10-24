import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Clock, Layers } from "lucide-react";

interface PlaceholderModulePageProps {
  moduleName: string;
  targetPhase: string;
  description: string;
}

export function PlaceholderModulePage({
  moduleName,
  targetPhase,
  description,
}: PlaceholderModulePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{moduleName}</h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <Badge variant="outline" className="text-brand-600 border-brand-200 bg-brand-50 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Scheduled for {targetPhase}
        </Badge>
      </div>

      <EmptyState
        icon={<Layers className="h-8 w-8 text-brand-600" />}
        title={`${moduleName} Module In Development`}
        description={`This module is intentionally planned for ${targetPhase} as instructed in the HCM Lite phased development roadmap. The underlying foundation, database migration templates, and role authorization routes are ready.`}
        actionLabel="Return to Overview"
        onAction={() => {
          window.location.href = "/";
        }}
      />
    </div>
  );
}
