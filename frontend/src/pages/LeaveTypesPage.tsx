import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { LeaveType, LeaveTypeUpdateInput } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  CalendarDays,
  Edit2,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

export function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<LeaveTypeUpdateInput>({
    annualQuota: 0,
    isPaid: true,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLeaveTypes();
      setLeaveTypes(data);
    } catch (err) {
      console.error("Failed to load leave types", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleOpenEdit = (lt: LeaveType) => {
    setSelectedType(lt);
    setFormData({
      annualQuota: Number(lt.annualQuota),
      isPaid: lt.isPaid,
      isActive: lt.isActive,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setFormError(null);

    if (formData.annualQuota < 0) {
      setFormError("Quota cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateLeaveType(selectedType.id, formData);
      setIsEditOpen(false);
      fetchLeaveTypes();
    } catch (err: any) {
      setFormError(err.message || "Failed to update leave type");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Policies & Quotas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure statutory annual leave allowances, paid status, and employee eligibility.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeaveTypes}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Info Notice */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start space-x-3 text-xs text-indigo-900">
        <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Company-Wide Statutory Leave Configuration</p>
          <p className="text-indigo-800 leading-relaxed">
            These statutory leave rules are enforced by the upcoming leave request and payroll deduction modules.
            Unpaid Leave is treated as unlimited subject to line manager and HR approval.
          </p>
        </div>
      </div>

      {/* Leave Types Grid & Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configured Leave Types</CardTitle>
          <CardDescription>
            Audit trails automatically track every modification to statutory allowances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading leave policies..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Leave Category</th>
                    <th className="px-4 py-3">Annual Allowance</th>
                    <th className="px-4 py-3">Compensation</th>
                    <th className="px-4 py-3">Policy Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveTypes.map((lt) => (
                    <tr key={lt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <span>{lt.name}</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {Number(lt.annualQuota) === 0 && !lt.isPaid ? (
                          <span className="text-slate-600 font-normal italic">Unlimited (Subject to approval)</span>
                        ) : (
                          `${lt.annualQuota} Days / Year`
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {lt.isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Paid Leave
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {lt.isActive ? (
                          <span className="inline-flex items-center text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Active Policy
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Suspended</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(lt)}>
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Configure
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDIT LEAVE POLICY MODAL */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Configure ${selectedType?.name}`}
        description="Update annual quota and payment rules."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="Annual Quota (Days) *"
            type="number"
            min="0"
            max="365"
            value={formData.annualQuota}
            onChange={(e) => setFormData({ ...formData, annualQuota: parseFloat(e.target.value) || 0 })}
            helperText="Set to 0 if this category is unpaid/flexible"
          />

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isPaidCheck"
              checked={formData.isPaid}
              onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isPaidCheck" className="text-sm font-medium text-slate-800">
              Paid Leave (Employee receives regular base salary during leave)
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-800">
              Policy Active (Employees can select this category when requesting leave)
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Quota
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
