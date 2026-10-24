import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Layers, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { user, company, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  if (!isOpen) return null;

  const role = user?.role || "EMPLOYEE";

  const getLinks = () => {
    if (role === "ADMIN") {
      return [
        { title: "Overview", href: "/" },
        { title: "Organization", href: "/organization" },
        { title: "Employees", href: "/employees" },
        { title: "Attendance", href: "/attendance" },
        { title: "Leave", href: "/leaves" },
        { title: "Payroll", href: "/payroll" },
        { title: "Analytics", href: "/analytics" },
        { title: "Announcements", href: "/announcements" },
        { title: "Audit Logs", href: "/audit-logs" },
        { title: "Settings", href: "/settings" },
      ];
    }
    if (role === "HR") {
      return [
        { title: "Overview", href: "/" },
        { title: "Employees", href: "/employees" },
        { title: "Attendance", href: "/attendance" },
        { title: "Leave", href: "/leaves" },
        { title: "Payroll", href: "/payroll" },
        { title: "Analytics", href: "/analytics" },
        { title: "Announcements", href: "/announcements" },
      ];
    }
    return [
      { title: "Overview", href: "/" },
      { title: "My Profile", href: "/my-profile" },
      { title: "My Attendance", href: "/my-attendance" },
      { title: "My Leave", href: "/my-leaves" },
      { title: "My Payslips", href: "/my-payslips" },
      { title: "Announcements", href: "/announcements" },
      { title: "AI Assistant", href: "/ai-assistant" },
    ];
  };

  const links = getLinks();

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-[#0f172a] p-6 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-white text-sm truncate max-w-[170px]">
                {company?.name || "HCM Lite"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="py-4">
            <div className="mb-3 px-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Role: {role}
              </span>
            </div>
            <nav className="space-y-1">
              {links.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {link.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">
                {user?.fullName}
              </p>
              <p className="text-xs text-slate-400 truncate max-w-[150px]">{user?.email}</p>
            </div>
            <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
              {role}
            </Badge>
          </div>
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex w-full items-center justify-center rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-slate-700 hover:text-rose-300 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
