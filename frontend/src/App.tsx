import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { SetupPage } from "./pages/SetupPage";
import { OverviewPage } from "./pages/OverviewPage";
import { OrganizationPage } from "./pages/OrganizationPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { DesignationsPage } from "./pages/DesignationsPage";
import { LeaveTypesPage } from "./pages/LeaveTypesPage";
import { LeaveManagementPage } from "./pages/LeaveManagementPage";
import { MyLeavesPage } from "./pages/MyLeavesPage";
import { HolidaysPage } from "./pages/HolidaysPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EmployeeProfilePage } from "./pages/EmployeeProfilePage";
import { AttendanceManagementPage } from "./pages/AttendanceManagementPage";
import { MyAttendancePage } from "./pages/MyAttendancePage";
import { PayrollManagementPage } from "./pages/PayrollManagementPage";
import { MyPayslipsPage } from "./pages/MyPayslipsPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { PlaceholderModulePage } from "./pages/PlaceholderModulePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoadingSpinner } from "./components/ui/loading";
import { UserRole } from "@hcm-lite/shared";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isCheckingSetup, setupStatus } = useAuth();
  const location = useLocation();

  if (isLoading || isCheckingSetup) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Verifying session and workspace status..." />
      </div>
    );
  }

  // If first-run setup has not been completed, redirect immediately to the setup wizard
  if (setupStatus && !setupStatus.setupCompleted && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-bold text-rose-900">Access Restricted</h3>
        <p className="text-sm text-rose-700 mt-2">
          Your account role (<span className="font-semibold">{user?.role}</span>) does not have permission
          to access this administrative module.
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<OverviewPage />} />

            {/* Organization & Workforce Management */}
            <Route
              path="/organization"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <OrganizationPage />
                </RoleGuard>
              }
            />
            <Route
              path="/departments"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <DepartmentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/designations"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <DesignationsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/leave-policies"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <LeaveTypesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/leaves"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <LeaveManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="/leave-approvals"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <LeaveManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="/holidays"
              element={<HolidaysPage />}
            />

            {/* Employee Management */}
            <Route
              path="/employees"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <EmployeesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/employees/:id"
              element={<EmployeeProfilePage />}
            />

            {/* System Audit Logs (Admin only) */}
            <Route
              path="/audit-logs"
              element={
                <RoleGuard allowedRoles={["ADMIN"]}>
                  <AuditLogsPage />
                </RoleGuard>
              }
            />

            {/* Attendance Management (Phase 4) */}
            <Route
              path="/attendance"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <AttendanceManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="/payroll"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <PayrollManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="/analytics"
              element={
                <RoleGuard allowedRoles={["ADMIN", "HR"]}>
                  <AnalyticsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/announcements"
              element={<AnnouncementsPage />}
            />
            <Route
              path="/settings"
              element={
                <RoleGuard allowedRoles={["ADMIN"]}>
                  <PlaceholderModulePage
                    moduleName="System Settings"
                    targetPhase="Settings Hub"
                    description="Company profile, branches, departments, and working hours."
                  />
                </RoleGuard>
              }
            />

            {/* Employee Self-Service Routes */}
            <Route
              path="/my-profile"
              element={<EmployeeProfilePage isSelf={true} />}
            />
            <Route
              path="/my-attendance"
              element={<MyAttendancePage />}
            />
            <Route
              path="/my-leaves"
              element={<MyLeavesPage />}
            />
            <Route
              path="/my-payslips"
              element={<MyPayslipsPage />}
            />
            <Route
              path="/ai-assistant"
              element={<AIAssistantPage />}
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
