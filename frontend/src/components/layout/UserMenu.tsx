import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, Building } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

export function UserMenu() {
  const { user, company, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const roleBadgeVariant =
    user.role === "ADMIN"
      ? "roleAdmin"
      : user.role === "HR"
      ? "roleHr"
      : "roleEmployee";

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        aria-label="User navigation menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white shadow-sm">
          {initials}
        </div>
        <div className="hidden text-left md:block">
          <p className="text-xs font-semibold text-slate-800 leading-tight">
            {user.fullName}
          </p>
          <p className="text-[11px] text-slate-500 capitalize">{user.role.toLowerCase()}</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-medium text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant={roleBadgeVariant}>{user.role}</Badge>
              {company && (
                <span className="text-[11px] text-slate-500 flex items-center truncate max-w-[120px]">
                  <Building className="h-3 w-3 mr-1 inline" />
                  {company.name}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
