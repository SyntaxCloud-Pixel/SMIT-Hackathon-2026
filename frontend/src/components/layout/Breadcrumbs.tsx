import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "": "Overview",
  "overview": "Overview",
  "employees": "Employees",
  "attendance": "Attendance",
  "leaves": "Leave Management",
  "payroll": "Payroll",
  "salary-structure": "Salary Structure",
  "analytics": "Company Analytics",
  "audit-logs": "Audit Logs",
  "announcements": "Announcements",
  "ai-assistant": "AI Assistant",
  "settings": "System Settings",
  "my-attendance": "My Attendance",
  "my-leaves": "My Leaves",
  "my-payslips": "My Payslips",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500">
      <Link
        to="/"
        className="flex items-center hover:text-slate-800 transition-colors"
      >
        <Home className="h-3.5 w-3.5 mr-1" />
        <span>HCM Lite</span>
      </Link>

      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[segment] || segment.replace(/-/g, " ");

        return (
          <div key={routeTo} className="flex items-center space-x-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-900 capitalize">
                {label}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-slate-800 transition-colors capitalize"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
