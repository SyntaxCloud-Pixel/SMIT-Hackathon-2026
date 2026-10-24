import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Holiday, HolidayInput } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

export function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  // Form
  const [formData, setFormData] = useState<HolidayInput>({
    name: "",
    holidayDate: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.getHolidays({
        year: selectedYear,
        search: search.trim() || undefined,
        page,
        pageSize: 15,
      });
      setHolidays(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Failed to load holidays", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [page, selectedYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHolidays();
  };

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      holidayDate: `${selectedYear}-01-01`,
      description: "",
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Holiday name is required.");
      return;
    }
    if (!formData.holidayDate) {
      setFormError("Date is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createHoliday(formData);
      setIsCreateOpen(false);
      fetchHolidays();
    } catch (err: any) {
      setFormError(err.message || "Failed to create holiday");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (h: Holiday) => {
    setSelectedHoliday(h);
    setFormData({
      name: h.name,
      holidayDate: h.holidayDate,
      description: h.description || "",
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoliday) return;
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Holiday name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateHoliday(selectedHoliday.id, formData);
      setIsEditOpen(false);
      fetchHolidays();
    } catch (err: any) {
      setFormError(err.message || "Failed to update holiday");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (h: Holiday) => {
    setSelectedHoliday(h);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHoliday) return;
    setIsSubmitting(true);
    try {
      await api.deleteHoliday(selectedHoliday.id);
      setIsDeleteOpen(false);
      fetchHolidays();
    } catch (err: any) {
      alert(err.message || "Failed to delete holiday");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Public Holidays</h1>
          <p className="text-sm text-slate-500 mt-1">
            Official holidays used by the attendance and leave systems to determine working days.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Public Holiday
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search holidays..."
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
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>

              <Button variant="ghost" size="icon" onClick={() => fetchHolidays()} title="Refresh list">
                <RotateCcw className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holidays Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Holiday Schedule for {selectedYear}</CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              {total} Holidays Scheduled
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading holidays..." />
          ) : holidays.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8 text-brand-600" />}
              title="No Holidays Scheduled"
              description={`No public holidays have been recorded for ${selectedYear}. Add your organization's official calendar days.`}
              actionLabel="Add Holiday"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Holiday Name</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Day of Week</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holidays.map((h) => {
                    const dateObj = new Date(h.holidayDate + "T00:00:00");
                    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <span>{h.name}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                          {h.holidayDate}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">{dayOfWeek}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                          {h.description || <span className="text-slate-400 italic">No notes</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(h)}>
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(h)}
                            className="text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* CREATE HOLIDAY DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Public Holiday"
        description="Schedule a company-wide non-working calendar holiday."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <Input
            label="Holiday Name *"
            placeholder="e.g. Independence Day, Eid-ul-Fitr"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Holiday Date (YYYY-MM-DD) *"
            type="date"
            value={formData.holidayDate}
            onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Official notification or holiday note..."
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
              Add Holiday
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT HOLIDAY DIALOG */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Public Holiday"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <Input
            label="Holiday Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Holiday Date (YYYY-MM-DD) *"
            type="date"
            value={formData.holidayDate}
            onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
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
              Save Holiday
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Public Holiday"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 text-sm text-slate-600">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p>
                Are you sure you want to remove the public holiday{" "}
                <span className="font-semibold text-slate-900">"{selectedHoliday?.name}"</span> scheduled for{" "}
                <span className="font-mono text-xs">{selectedHoliday?.holidayDate}</span>?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Attendance and leave calculations for this date will revert to regular working day logic.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" isLoading={isSubmitting} onClick={handleConfirmDelete}>
              Delete Holiday
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
