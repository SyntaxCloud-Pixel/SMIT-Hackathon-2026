import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { LeaveRequest, Department, LeaveType } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [departmentId, setDepartmentId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  // Review Dialog State
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchFiltersData = useCallback(async () => {
    try {
      const [depts, lts] = await Promise.all([
        api.getDepartments({ pageSize: 100 }),
        api.getLeaveTypes(),
      ]);
      setDepartments(depts.items.filter((d) => d.isActive));
      setLeaveTypes(lts.filter((lt) => lt.isActive));
    } catch (err) {
      console.error("Failed to load filter metadata", err);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getCompanyLeaveRequests({
        status: statusFilter || undefined,
        departmentId: departmentId || undefined,
        leaveTypeId: leaveTypeId || undefined,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setRequests(res.items);
      setTotalPages(res.totalPages);
      setTotalRequests(res.total);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load leave requests");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, departmentId, leaveTypeId, searchQuery, currentPage]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenReview = (request: LeaveRequest) => {
    setReviewTarget(request);
    setReviewComments("");
    setErrorMsg(null);
  };

  const handleExecuteReview = async (decision: "APPROVED" | "REJECTED") => {
    if (!reviewTarget) return;
    setIsReviewing(true);
    try {
      await api.reviewLeaveRequest(reviewTarget.id, {
        status: decision,
        comments: reviewComments.trim() || undefined,
      });
      setSuccessMsg(`Leave request successfully ${decision.toLowerCase()}!`);
      setReviewTarget(null);
      await fetchRequests();
    } catch (err: any) {
      alert(err.message || "Failed to review leave request");
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending Review</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Approvals & Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">
            Workforce leave requests, balance quota reviews, and administrative decisioning.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Review Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
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

            {/* Leave Type Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Leave Policy</label>
              <select
                value={leaveTypeId}
                onChange={(e) => {
                  setLeaveTypeId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Policies</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name}
                  </option>
                ))}
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
                placeholder="Search staff name or code..."
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-brand-600" />
            Requests Queue ({totalRequests})
          </CardTitle>
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner text="Retrieving leave queue..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Staff Member</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Policy</th>
                    <th className="px-4 py-3 font-semibold">Dates & Days</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Reviewer Notes</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        No leave requests found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{r.employeeName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{r.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.departmentName || "--"}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{r.leaveTypeName}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{r.startDate} to {r.endDate}</div>
                          <div className="text-[11px] text-brand-700 font-mono font-semibold">
                            {r.workingDays} working {r.workingDays === 1 ? "day" : "days"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                        <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs">
                          {r.reviewerName ? (
                            <div>
                              <span className="font-semibold text-slate-700">{r.reviewerName}</span>
                              {r.reviewerComments && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">"{r.reviewerComments}"</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "PENDING" ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReview(r)}
                              className="h-7 text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold"
                            >
                              <FileCheck className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-xs">Processed</span>
                          )}
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

      {/* Review & Decision Modal */}
      {reviewTarget && (
        <Dialog
          isOpen={Boolean(reviewTarget)}
          onClose={() => setReviewTarget(null)}
          title="Review Leave Application"
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Member:</span>
                <span className="font-semibold text-slate-900">
                  {reviewTarget.employeeName} ({reviewTarget.employeeCode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="text-slate-800">{reviewTarget.departmentName || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Policy:</span>
                <span className="font-semibold text-slate-900">{reviewTarget.leaveTypeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="text-slate-900">
                  {reviewTarget.startDate} to {reviewTarget.endDate} (<strong>{reviewTarget.workingDays} working days</strong>)
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 text-slate-700">
                <span className="text-slate-500 block mb-1 font-semibold">Staff Reason:</span>
                <p className="italic bg-white p-2 rounded border border-slate-100">{reviewTarget.reason}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Review Comments / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="e.g. Approved. Please ensure task handover is completed."
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReviewTarget(null)}
                disabled={isReviewing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExecuteReview("REJECTED")}
                disabled={isReviewing}
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleExecuteReview("APPROVED")}
                disabled={isReviewing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Approve Leave
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
