import { useState, useEffect } from "react";
import { api } from "@/services/api";
import {
  Department,
  Designation,
  EmployeeProfile,
  EmployeeRegisterInput,
} from "@hcm-lite/shared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
} from "lucide-react";

interface EmployeeRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: EmployeeRegistrationModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<EmployeeProfile[]>([]);

  // Form State
  const [formData, setFormData] = useState<EmployeeRegisterInput>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    departmentId: "",
    designationId: "",
    employeeCode: "",
    employmentType: "FULL_TIME",
    joiningDate: new Date().toISOString().slice(0, 10),
    reportingManagerId: null,
    basicSalary: 0,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success State (Temporary Password Dialog)
  const [createdResult, setCreatedResult] = useState<{
    employee: EmployeeProfile;
    temporaryPassword?: string;
  } | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCreatedResult(null);
      setFormError(null);
      setHasCopiedPassword(false);
      loadMetadata();
    }
  }, [isOpen]);

  const loadMetadata = async () => {
    try {
      const [deptRes, desigRes, empRes] = await Promise.all([
        api.getDepartments({ isActive: true, pageSize: 100 }),
        api.getDesignations({ isActive: true, pageSize: 100 }),
        api.getEmployees({ employmentStatus: "ACTIVE", pageSize: 500 }),
      ]);
      setDepartments(deptRes.items);
      setDesignations(desigRes.items);
      setExistingEmployees(empRes.items);

      if (deptRes.items.length > 0 && !formData.departmentId) {
        setFormData((prev) => ({ ...prev, departmentId: deptRes.items[0].id }));
      }
      if (desigRes.items.length > 0 && !formData.designationId) {
        setFormData((prev) => ({ ...prev, designationId: desigRes.items[0].id }));
      }
    } catch (err) {
      console.error("Failed to load registration metadata", err);
    }
  };

  const handleGenerateCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, employeeCode: `EMP-${randomNum}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName.trim()) return setFormError("Full name is required.");
    if (!formData.email.trim()) return setFormError("Work email is required.");
    if (!formData.employeeCode.trim()) return setFormError("Employee ID/Code is required.");
    if (!formData.departmentId) return setFormError("Please select a department.");
    if (!formData.designationId) return setFormError("Please select a designation.");
    if (formData.basicSalary < 0) return setFormError("Basic salary cannot be negative.");

    setIsSubmitting(true);
    try {
      const result = await api.registerEmployee(formData);
      setCreatedResult(result);
      onSuccess();
    } catch (err: any) {
      setFormError(err.message || "Failed to register employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (createdResult?.temporaryPassword) {
      navigator.clipboard.writeText(createdResult.temporaryPassword);
      setHasCopiedPassword(true);
      setTimeout(() => setHasCopiedPassword(false), 3000);
    }
  };

  // Filter designations by selected department if applicable
  const availableDesignations = designations.filter(
    (des) => !des.departmentId || des.departmentId === formData.departmentId
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={createdResult ? "Registration Successful" : "Register New Employee"}
      description={
        createdResult
          ? "The employee profile and login identity have been created securely."
          : "Create an employee record and system login account. The account will require a password change on first sign-in."
      }
      className="max-w-2xl"
    >
      {createdResult ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <h4 className="text-sm font-semibold text-emerald-900 flex items-center">
              <Check className="h-4 w-4 mr-1.5 text-emerald-600" />
              Employee Account Initialized
            </h4>
            <div className="mt-3 text-xs text-emerald-800 space-y-1">
              <p>
                <strong>Employee:</strong> {createdResult.employee.fullName} ({createdResult.employee.employeeCode})
              </p>
              <p>
                <strong>Work Email:</strong> {createdResult.employee.email}
              </p>
              <p>
                <strong>Role:</strong> EMPLOYEE
              </p>
            </div>
          </div>

          {createdResult.temporaryPassword && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-900">
                <KeyRound className="h-4 w-4 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Temporary Sign-In Password
                </span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Provide these credentials to the employee. For security, the system will prompt them to set their own permanent password upon their initial sign-in.
              </p>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-indigo-200 mt-2">
                <span className="font-mono text-sm font-bold text-slate-800 select-all">
                  {createdResult.temporaryPassword}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {hasCopiedPassword ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Elena Rostova"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              autoFocus
            />

            <Input
              label="Work Email Address *"
              type="email"
              placeholder="elena@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Employee ID / Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="text-[11px] text-brand-600 hover:text-brand-800 font-medium flex items-center"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. EMP-1042"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              />
            </div>

            <Input
              label="Phone Number"
              placeholder="+1-555-0199"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Department *
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                {departments.length === 0 && <option value="">No active departments</option>}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Designation *
              </label>
              <select
                value={formData.designationId}
                onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                {availableDesignations.length === 0 && <option value="">No designations</option>}
                {availableDesignations.map((des) => (
                  <option key={des.id} value={des.id}>
                    {des.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Employment Type *
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>

            <Input
              label="Joining Date *"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
            />

            <Input
              label="Basic Monthly Salary"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={formData.basicSalary}
              onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Reporting Manager (Optional)
            </label>
            <select
              value={formData.reportingManagerId || ""}
              onChange={(e) =>
                setFormData({ ...formData, reportingManagerId: e.target.value || null })
              }
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              <option value="">No direct manager / Executive</option>
              {existingEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode} - {emp.designationName || "Staff"})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Residential Address"
            placeholder="Street address, apartment, city"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Register Employee
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
