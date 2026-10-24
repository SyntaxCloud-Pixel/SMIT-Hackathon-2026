import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  CalendarOff,
  CreditCard,
  BarChart3,
  Shield,
  Settings,
  Megaphone,
  Bot,
  ChevronLeft,
  ChevronRight,
  Layers,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ isCollapsed, onToggleCollapse, className }: SidebarProps) {
  const { user, company } = useAuth();
  const location = useLocation();

  const getNavSections = (): { heading?: string; items: NavItem[] }[] => {
    const role = user?.role || "EMPLOYEE";

    if (role === "ADMIN") {
      return [
        {
          items: [{ title: "Overview", href: "/", icon: LayoutDashboard }],
        },
        {
          heading: "Management",
          items: [
            { title: "Organization", href: "/organization", icon: Building2 },
            { title: "Employees", href: "/employees", icon: Users },
            { title: "Attendance", href: "/attendance", icon: CalendarCheck },
            { title: "Leave", href: "/leaves", icon: CalendarOff },
            { title: "Payroll", href: "/payroll", icon: CreditCard },
          ],
        },
        {
          heading: "Insights & Controls",
          items: [
            { title: "Analytics", href: "/analytics", icon: BarChart3 },
            { title: "AI Assistant", href: "/ai-assistant", icon: Bot },
            { title: "Announcements", href: "/announcements", icon: Megaphone },
            { title: "Audit Logs", href: "/audit-logs", icon: Shield },
            { title: "Settings", href: "/settings", icon: Settings },
          ],
        },
      ];
    }

    if (role === "HR") {
      return [
        {
          items: [{ title: "Overview", href: "/", icon: LayoutDashboard }],
        },
        {
          heading: "Workforce",
          items: [
            { title: "Employees", href: "/employees", icon: Users },
            { title: "Attendance", href: "/attendance", icon: CalendarCheck },
            { title: "Leave", href: "/leaves", icon: CalendarOff },
            { title: "Payroll", href: "/payroll", icon: CreditCard },
          ],
        },
        {
          heading: "Operations",
          items: [
            { title: "Analytics", href: "/analytics", icon: BarChart3 },
            { title: "AI Assistant", href: "/ai-assistant", icon: Bot },
            { title: "Announcements", href: "/announcements", icon: Megaphone },
          ],
        },
      ];
    }

    // EMPLOYEE navigation
    return [
      {
        items: [{ title: "Overview", href: "/", icon: LayoutDashboard }],
      },
      {
        heading: "Self Service",
        items: [
          { title: "My Profile", href: "/my-profile", icon: User },
          { title: "My Attendance", href: "/my-attendance", icon: CalendarCheck },
          { title: "My Leave", href: "/my-leaves", icon: CalendarOff },
          { title: "My Payslips", href: "/my-payslips", icon: CreditCard },
        ],
      },
      {
        heading: "Engagement",
        items: [
          { title: "Announcements", href: "/announcements", icon: Megaphone },
          { title: "AI Assistant", href: "/ai-assistant", icon: Bot },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#0f172a] text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800 z-30",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
        <Link to="/" className="flex items-center space-x-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md">
            <Layers className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-white tracking-tight truncate">
                {company?.name || "HCM Lite"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Enterprise Suite</span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {section.heading && !isCollapsed && (
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {section.heading}
              </h4>
            )}
            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={isCollapsed ? item.title : undefined}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group",
                    isActive
                      ? "bg-brand-600 text-white shadow-sm font-semibold"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100",
                    isCollapsed && "justify-center px-0 py-2.5"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="text-[9px] font-medium rounded px-1.5 py-0.5 bg-brand-950 text-brand-300 border border-brand-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Role Pill Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Signed In As:</span>
            <Badge
              variant={
                user?.role === "ADMIN"
                  ? "roleAdmin"
                  : user?.role === "HR"
                  ? "roleHr"
                  : "roleEmployee"
              }
            >
              {user?.role || "EMPLOYEE"}
            </Badge>
          </div>
        </div>
      )}
    </aside>
  );
}
