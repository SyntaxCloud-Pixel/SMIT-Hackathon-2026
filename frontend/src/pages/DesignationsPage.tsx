import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Designation, Department, DesignationInput } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

export function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedDesig, setSelectedDesig] = useState<Designation | null>(null);

  // Form
  const [formData, setFormData] = useState<DesignationInput>({
    name: "",
    departmentId: null,
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await api.getDepartments({ pageSize: 100 });
      setDepartments(res.items);
    } catch (err) {
      console.error("Failed to load departments list", err);
    }
  };

  const fetchDesignations = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDesignations({
        search: search.trim() || undefined,
        departmentId: deptFilter === "all" ? undefined : deptFilter,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        pageSize: 10,
      });
      setDesignations(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Failed to load designations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchDesignations();
  }, [page, deptFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDesignations();
  };

  const handleOpenCreate = () => {
    setFormData({ name: "", departmentId: null, description: "" });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Designation title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createDesignation(formData);
      setIsCreateOpen(false);
      fetchDesignations();
    } catch (err: any) {
      setFormError(err.message || "Failed to create designation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (desig: Designation) => {
    setSelectedDesig(desig);
    setFormData({
      name: desig.name,
      departmentId: desig.departmentId || null,
      description: desig.description || "",
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesig) return;
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Designation title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateDesignation(selectedDesig.id, formData);
      setIsEditOpen(false);
      fetchDesignations();
    } catch (err: any) {
      setFormError(err.message || "Failed to update designation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeactivate = (desig: Designation) => {
    setSelectedDesig(desig);
    setIsDeactivateOpen(true);
  };

  const handleConfirmToggleActive = async () => {
    if (!selectedDesig) return;
    setIsSubmitting(true);
    try {
      await api.deactivateDesignation(selectedDesig.id, !selectedDesig.isActive);
      setIsDeactivateOpen(false);
      fetchDesignations();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Designations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define job roles, career levels, and their department associations.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Designation
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search designations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm w-full rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <Button type="submit" variant="secondary" size="default">
                Search
              </Button>
            </form>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>

              <Button variant="ghost" size="icon" onClick={() => fetchDesignations()} title="Refresh list">
                <RotateCcw className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Designations Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Designations Directory</CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Showing {designations.length} of {total} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading designations..." />
          ) : designations.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-8 w-8 text-brand-600" />}
              title="No Designations Found"
              description={
                search
                  ? "No designations match your search criteria. Try a different query."
                  : "No designations have been configured yet. Add your first job title."
              }
              actionLabel="Add Designation"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Designation Title</th>
                    <th className="px-4 py-3">Associated Department</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {designations.map((desig) => (
                    <tr key={desig.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <span>{desig.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {desig.departmentName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                            {desig.departmentName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Company-wide</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                        {desig.description || <span className="text-slate-400 italic">No description</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {desig.isActive ? (
                          <span className="inline-flex items-center text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-500 font-medium">
                            <XCircle className="h-3.5 w-3.5 mr-1 text-slate-400" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(desig)}>
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeactivate(desig)}
                          className={desig.isActive ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}
                        >
                          {desig.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-2">
                  <span className="text-xs text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DESIGNATION DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Designation"
        description="Add a specific job title or career band."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <Input
            label="Designation Title *"
            placeholder="e.g. Senior Software Engineer, Operations Manager"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Department (Optional)
            </label>
            <select
              value={formData.departmentId || ""}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || null })}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              <option value="">Company-wide / General</option>
              {departments
                .filter((d) => d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Responsibilities and key qualifications..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Designation
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT DESIGNATION DIALOG */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Designation"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <Input
            label="Designation Title *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Department (Optional)
            </label>
            <select
              value={formData.departmentId || ""}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || null })}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            >
              <option value="">Company-wide / General</option>
              {departments
                .filter((d) => d.isActive || d.id === formData.departmentId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {!d.isActive ? "(Deactivated)" : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        title={selectedDesig?.isActive ? "Deactivate Designation" : "Activate Designation"}
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 text-sm text-slate-600">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Are you sure you want to{" "}
                <strong>{selectedDesig?.isActive ? "deactivate" : "reactivate"}</strong> the designation{" "}
                <span className="font-semibold text-slate-900">"{selectedDesig?.name}"</span>?
              </p>
              {selectedDesig?.isActive && (
                <p className="text-xs text-slate-500">
                  Existing employee designations and historical records remain preserved, but new employees
                  cannot be assigned to deactivated designations.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedDesig?.isActive ? "destructive" : "default"}
              isLoading={isSubmitting}
              onClick={handleConfirmToggleActive}
            >
              {selectedDesig?.isActive ? "Deactivate Designation" : "Reactivate Designation"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
