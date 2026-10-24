import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  EmployeeProfile,
  Department,
  Designation,
  EmployeeUpdateInput,
} from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Shield,
  Edit2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  KeyRound,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

export function EmployeeProfilePage({ isSelf = false }: { isSelf?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isHrOrAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EmployeeUpdateInput>({
    fullName: "",
    phone: "",
    address: "",
    departmentId: "",
    designationId: "",
    employmentType: "FULL_TIME",
    joiningDate: "",
    reportingManagerId: null,
    basicSalary: 0,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Change Dialog (Deactivate / Activate)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const targetId = isSelf ? "me" : id;
      if (!targetId) throw new Error("No employee specified");

      const data = await api.getEmployee(targetId);
      setEmployee(data);

      if (isHrOrAdmin) {
        const [dRes, desRes, eRes] = await Promise.all([
          api.getDepartments({ pageSize: 100 }),
          api.getDesignations({ pageSize: 100 }),
          api.getEmployees({ pageSize: 200 }),
        ]);
        setDepartments(dRes.items);
        setDesignations(desRes.items);
        setExistingEmployees(eRes.items.filter((e) => e.id !== data.id));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load employee profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id, isSelf]);

  const handleOpenEdit = () => {
    if (!employee) return;
    setEditFormData({
      fullName: employee.fullName,
      phone: employee.phone || "",
      address: employee.address || "",
      departmentId: employee.departmentId || "",
      designationId: employee.designationId || "",
      employmentType: employee.employmentType,
      joiningDate: employee.joiningDate,
      reportingManagerId: employee.reportingManagerId || null,
      basicSalary: employee.basicSalary ?? 0,
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setEditError(null);

    setIsSubmittingEdit(true);
    try {
      const updated = await api.updateEmployee(employee.id, editFormData);
      setEmployee(updated);
      setIsEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to update profile");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleActiveStatus = async () => {
    if (!employee) return;
    setIsSubmittingStatus(true);
    try {
      const nextActive = !employee.isActive;
      const nextStatus = nextActive ? "ACTIVE" : "INACTIVE";
      const updated = await api.updateEmployeeStatus(employee.id, {
        isActive: nextActive,
        employmentStatus: nextStatus,
      });
      setEmployee(updated);
      setIsStatusDialogOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to change employee status");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Retrieving employee profile..." />;
  }

  if (errorMsg || !employee) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-xl text-center max-w-lg mx-auto mt-12 space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Profile Inaccessible</h3>
        <p className="text-sm text-slate-600">{errorMsg || "Record does not exist."}</p>
        <Button variant="outline" size="sm" onClick={() => navigate(isSelf ? "/" : "/employees")}>
          Return
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      {!isSelf && (
        <button
          onClick={() => navigate("/employees")}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Employee Directory
        </button>
      )}

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              {employee.fullName[0]}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {employee.fullName}
                </h1>
                <Badge
                  variant={
                    employee.employmentStatus === "ACTIVE"
                      ? "success"
                      : employee.employmentStatus === "ON_LEAVE"
                      ? "warning"
                      : "destructive"
                  }
                  className="capitalize"
                >
                  {employee.employmentStatus.replace("_", " ").toLowerCase()}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <span>{employee.designationName || "Team Member"}</span>
                <span className="text-slate-300">•</span>
                <span>{employee.departmentName || "General Operations"}</span>
              </p>
              <p className="text-xs font-mono text-slate-400">
                Employee Code: {employee.employeeCode}
              </p>
            </div>
          </div>

          {/* Action buttons for HR/Admin */}
          {isHrOrAdmin && (
            <div className="flex items-center space-x-3 self-start md:self-auto">
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit Profile
              </Button>
              {employee.userId !== user?.id && (
                <Button
                  variant={employee.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => setIsStatusDialogOpen(true)}
                  className={!employee.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {employee.isActive ? "Deactivate" : "Activate"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid: 3-column breakdown of profile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Personal Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-slate-900">
              <User className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base">Personal Information</CardTitle>
            </div>
            <CardDescription>Contact channels and residential address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div className="flex items-start space-x-3">
              <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Email</span>
                <span className="text-slate-800 break-all">{employee.email}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Phone</span>
                <span className="text-slate-800">{employee.phone || "—"}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Address</span>
                <span className="text-slate-800">{employee.address || "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Employment Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-slate-900">
              <Briefcase className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base">Employment Information</CardTitle>
            </div>
            <CardDescription>Department, designation, and reporting line</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div className="flex items-start space-x-3">
              <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Department</span>
                <span className="text-slate-800 font-medium">{employee.departmentName || "—"}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Briefcase className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Employment Type</span>
                <span className="text-slate-800 capitalize">
                  {employee.employmentType.replace("_", " ").toLowerCase()}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Joining Date</span>
                <span className="text-slate-800 font-mono text-xs">{employee.joiningDate}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Reporting Line</span>
                <span className="text-slate-800 font-medium">
                  {employee.reportingManagerName || "No direct line manager"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Compensation & Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 text-slate-900">
              <Shield className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base">Security & Compensation</CardTitle>
            </div>
            <CardDescription>Salary grade and account authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            {employee.basicSalary !== undefined ? (
              <div className="flex items-start space-x-3">
                <CreditCard className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-[11px] text-slate-400 uppercase font-semibold">Basic Salary</span>
                  <span className="text-base font-bold text-slate-900">
                    ${employee.basicSalary.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Monthly gross base</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Compensation information is restricted to authorized roles.
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <span className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                Account Status
              </span>
              <div className="flex items-center space-x-2">
                {employee.isActive ? (
                  <span className="inline-flex items-center text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Account Active
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs text-rose-700 font-medium">
                    <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
                    Account Suspended
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                Security Profile
              </span>
              {employee.mustChangePassword ? (
                <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                  <KeyRound className="h-3 w-3 mr-1 text-amber-600" />
                  Must change password on next sign-in
                </span>
              ) : (
                <span className="text-xs text-slate-600">Password initialized</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EDIT EMPLOYEE PROFILE DIALOG */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee Profile"
        description="Update personal and employment details. Security credentials remain unaffected."
        className="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={editFormData.fullName}
              onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              autoFocus
            />
            <Input
              label="Phone Number"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Department *
              </label>
              <select
                value={editFormData.departmentId}
                onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {!d.isActive ? "(Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Designation *
              </label>
              <select
                value={editFormData.designationId}
                onChange={(e) => setEditFormData({ ...editFormData, designationId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                {designations.map((des) => (
                  <option key={des.id} value={des.id}>
                    {des.name} {!des.isActive ? "(Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Employment Type
              </label>
              <select
                value={editFormData.employmentType}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, employmentType: e.target.value as any })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>

            <Input
              label="Joining Date"
              type="date"
              value={editFormData.joiningDate}
              onChange={(e) => setEditFormData({ ...editFormData, joiningDate: e.target.value })}
            />

            {isHrOrAdmin && (
              <Input
                label="Basic Salary ($)"
                type="number"
                min="0"
                step="any"
                value={editFormData.basicSalary}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, basicSalary: parseFloat(e.target.value) || 0 })
                }
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Reporting Manager
            </label>
            <select
              value={editFormData.reportingManagerId || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, reportingManagerId: e.target.value || null })
              }
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              <option value="">No direct manager</option>
              {existingEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Residential Address"
            value={editFormData.address}
            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
          />

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmittingEdit}>
              Save Profile
            </Button>
          </div>
        </form>
      </Dialog>

      {/* STATUS TOGGLE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        title={employee.isActive ? "Deactivate Employee" : "Reactivate Employee"}
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 text-sm text-slate-600">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p>
                Are you sure you want to{" "}
                <strong>{employee.isActive ? "deactivate" : "reactivate"}</strong> employee{" "}
                <span className="font-semibold text-slate-900">"{employee.fullName}"</span> (
                {employee.employeeCode})?
              </p>
              {employee.isActive && (
                <p className="text-xs text-slate-500 mt-2">
                  Deactivating this employee will immediately revoke active sessions and block future logins.
                  Historical attendance, leave requests, and payroll records will remain fully preserved.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={employee.isActive ? "destructive" : "default"}
              isLoading={isSubmittingStatus}
              onClick={handleToggleActiveStatus}
              className={!employee.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {employee.isActive ? "Confirm Deactivation" : "Reactivate Employee"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
