import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Department, DepartmentInput } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Form states
  const [formData, setFormData] = useState<DepartmentInput>({ name: "", description: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDepartments({
        search: search.trim() || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        pageSize: 10,
      });
      setDepartments(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error("Failed to load departments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDepartments();
  };

  const handleOpenCreate = () => {
    setFormData({ name: "", description: "" });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Department name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createDepartment(formData);
      setIsCreateOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || "Failed to create department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({ name: dept.name, description: dept.description || "" });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Department name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateDepartment(selectedDept.id, formData);
      setIsEditOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || "Failed to update department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeactivate = (dept: Department) => {
    setSelectedDept(dept);
    setIsDeactivateOpen(true);
  };

  const handleConfirmToggleActive = async () => {
    if (!selectedDept) return;
    setIsSubmitting(true);
    try {
      await api.deactivateDepartment(selectedDept.id, !selectedDept.isActive);
      setIsDeactivateOpen(false);
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your company departments, descriptions, and workforce assignments.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
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
                  placeholder="Search departments..."
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

              <Button variant="ghost" size="icon" onClick={() => fetchDepartments()} title="Refresh list">
                <RotateCcw className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departments Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Department Directory</CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Showing {departments.length} of {total} total
            </span>
          </div>
          <CardDescription>
            Employee counts reflect actual active employee records linked in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading departments..." />
          ) : departments.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8 text-brand-600" />}
              title="No Departments Found"
              description={
                search
                  ? "No departments match your search criteria. Try a different query."
                  : "No departments have been added yet. Add your first company department."
              }
              actionLabel="Add Department"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-center">Active Employees</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span>{dept.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                        {dept.description || <span className="text-slate-400 italic">No description</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          <Users className="h-3 w-3 mr-1 text-slate-400" />
                          {dept.employeeCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {dept.isActive ? (
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
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(dept.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(dept)}>
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeactivate(dept)}
                          className={dept.isActive ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}
                        >
                          {dept.isActive ? "Deactivate" : "Activate"}
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

      {/* CREATE DEPARTMENT DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Department"
        description="Add a functional department unit to your organization structure."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <Input
            label="Department Name *"
            placeholder="e.g. Engineering, Sales, Human Resources"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Primary responsibilities and domain of this department..."
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
              Create Department
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT DEPARTMENT DIALOG */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Department"
        description="Update department title and responsibilities."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <Input
            label="Department Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
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
        title={selectedDept?.isActive ? "Deactivate Department" : "Activate Department"}
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 text-sm text-slate-600">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Are you sure you want to{" "}
                <strong>{selectedDept?.isActive ? "deactivate" : "reactivate"}</strong> the department{" "}
                <span className="font-semibold text-slate-900">"{selectedDept?.name}"</span>?
              </p>
              {selectedDept?.isActive && (
                <p className="text-xs text-slate-500">
                  Deactivating this department will prevent new employees from being assigned to it. Existing
                  employee contracts, attendance, and leave records will remain preserved.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedDept?.isActive ? "destructive" : "default"}
              isLoading={isSubmitting}
              onClick={handleConfirmToggleActive}
            >
              {selectedDept?.isActive ? "Deactivate Department" : "Reactivate Department"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
