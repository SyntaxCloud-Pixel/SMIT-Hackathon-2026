import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { AttendanceRecord, AttendanceSummary, Department } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { AttendanceCorrectionModal } from "./AttendanceCorrectionModal";
import {
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  Download,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Calendar,
  Hourglass,
} from "lucide-react";

export function AttendanceManagementPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [departmentId, setDepartmentId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const sum = await api.getAttendanceSummary(selectedDate);
      setSummary(sum);
    } catch (err: any) {
      console.error("Failed to load attendance summary", err);
    }
  }, [selectedDate]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getCompanyAttendance({
        date: selectedDate || undefined,
        departmentId: departmentId || undefined,
        status: statusFilter || undefined,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setRecords(res.items);
      setTotalPages(res.totalPages);
      setTotalRecords(res.total);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load attendance list");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, departmentId, statusFilter, searchQuery, currentPage]);

  const fetchInitialData = useCallback(async () => {
    try {
      const depts = await api.getDepartments({ pageSize: 100 });
      setDepartments(depts.items.filter((d) => d.isActive));
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchSummary();
    fetchRecords();
  }, [fetchSummary, fetchRecords]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.downloadAttendanceCsv({
        date: selectedDate || undefined,
        departmentId: departmentId || undefined,
        status: statusFilter || undefined,
        search: searchQuery.trim() || undefined,
      });
    } catch (err: any) {
      alert(err.message || "Failed to export attendance CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenCorrection = (record: AttendanceRecord) => {
    setCorrectionTarget(record);
    setIsCorrectionModalOpen(true);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "PRESENT") return <Badge variant="success">Present</Badge>;
    if (status === "LATE" || isLate) return <Badge variant="warning">Late Arrival</Badge>;
    if (status === "HALF_DAY") return <Badge variant="warning">Half Day</Badge>;
    if (status === "ABSENT") return <Badge variant="destructive">Absent</Badge>;
    if (status === "ON_LEAVE") return <Badge variant="outline">On Leave</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">
            Company-wide timesheets, real-time arrival logs, exception tracking, and administrative corrections.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => { fetchSummary(); fetchRecords(); }}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isExporting}>
            <Download className="mr-2 h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Daily KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Staff</p>
              <h3 className="text-lg font-bold text-slate-900">{summary?.totalEmployees || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Present</p>
              <h3 className="text-lg font-bold text-emerald-700">{summary?.presentCount || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Late Arrivals</p>
              <h3 className="text-lg font-bold text-amber-600">{summary?.lateCount || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Missing Punch-out</p>
              <h3 className="text-lg font-bold text-blue-700">{summary?.missingCheckoutsCount || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Absent</p>
              <h3 className="text-lg font-bold text-rose-600">{summary?.absentCount || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs"
              />
            </div>

            {/* Department Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late Arrival</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center">
                <Search className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                Search
              </label>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name or code..."
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Attendance Log ({totalRecords})
          </CardTitle>
          <span className="text-xs text-slate-500">
            Showing Page {currentPage} of {totalPages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner text="Retrieving attendance roster..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Check-In</th>
                    <th className="px-4 py-3 font-semibold">Check-Out</th>
                    <th className="px-4 py-3 font-semibold">Worked</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        No attendance records match the selected date and filters.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{r.employeeName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{r.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.departmentName || "--"}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{r.attendanceDate}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatTime(r.checkIn)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatTime(r.checkOut)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {r.workedMinutes > 0 ? formatDuration(r.workedMinutes) : "--"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            {getStatusBadge(r.status, r.isLate)}
                            {r.isCorrected && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Corrected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCorrection(r)}
                            className="h-8 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Correct
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setCorrectionTarget(null);
        }}
        onSuccess={() => {
          fetchSummary();
          fetchRecords();
        }}
        record={correctionTarget}
      />
    </div>
  );
}
