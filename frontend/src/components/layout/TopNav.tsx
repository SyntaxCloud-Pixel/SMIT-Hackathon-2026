import { useEffect, useState } from "react";
import { Menu, Server, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { NotificationDropdown } from "./NotificationDropdown";
import { api } from "@/services/api";
import { HealthCheckData } from "@hcm-lite/shared";

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

export function TopNav({ onOpenMobileMenu }: TopNavProps) {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [healthStatus, setHealthStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    let isMounted = true;
    async function checkBackend() {
      try {
        const data = await api.getHealth();
        if (isMounted) {
          setHealth(data);
          setHealthStatus(data.status === "healthy" ? "connected" : "connected");
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus("disconnected");
        }
      }
    }
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden focus:outline-none"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Backend API & Database status badge */}
        <div
          title={
            health
              ? `API: Healthy | DB: ${health.database.status} (Uptime: ${health.uptime}s)`
              : "Connecting to API..."
          }
          className="flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors bg-slate-50 border-slate-200 text-slate-600"
        >
          <Server className="h-3 w-3 text-slate-400" />
          <span className="hidden md:inline">API:</span>
          {healthStatus === "connected" ? (
            <span className="flex items-center text-emerald-600 font-semibold">
              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              Live
            </span>
          ) : healthStatus === "checking" ? (
            <span className="flex items-center text-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1 inline animate-pulse" />
              Probing
            </span>
          ) : (
            <span className="flex items-center text-rose-600 font-semibold">
              <XCircle className="h-3 w-3 mr-1 inline" />
              Offline
            </span>
          )}
        </div>

        {/* Notification Bell */}
        <NotificationDropdown />

        <div className="h-5 w-px bg-slate-200" />

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
