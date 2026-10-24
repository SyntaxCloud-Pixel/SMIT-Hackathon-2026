import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import {
  LeaveRequest,
  LeaveBalanceSummary,
  WorkingDaysEstimateResponse,
} from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  CalendarDays,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
} from "lucide-react";

export function MyLeavesPage() {
  const [balances, setBalances] = useState<LeaveBalanceSummary[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Leave Application Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimate, setEstimate] = useState<WorkingDaysEstimateResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [bals, reqs] = await Promise.all([
        api.getLeaveBalances(),
        api.getMyLeaveRequests(),
      ]);
      setBalances(bals);
      setRequests(reqs);
      if (bals.length > 0 && !selectedLeaveTypeId) {
        setSelectedLeaveTypeId(bals[0].leaveTypeId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load leave records");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLeaveTypeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recalculate working days whenever startDate or endDate changes
  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      const fetchEstimate = async () => {
        setIsEstimating(true);
        try {
          const res = await api.estimateLeaveWorkingDays(startDate, endDate);
          setEstimate(res);
        } catch (err: any) {
          console.error("Estimate failed", err);
        } finally {
          setIsEstimating(false);
        }
      };
      fetchEstimate();
    } else {
      setEstimate(null);
    }
  }, [startDate, endDate]);

  const handleOpenApplyModal = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setEstimate(null);
    setModalError(null);
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveTypeId || !startDate || !endDate || !reason.trim()) {
      setModalError("Please complete all required fields.");
      return;
    }
    if (startDate > endDate) {
      setModalError("End date cannot be earlier than start date.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await api.submitLeaveRequest({
        leaveTypeId: selectedLeaveTypeId,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      setSuccessMsg("Leave request submitted successfully for approval!");
      setIsApplyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit leave request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to cancel this pending leave request?")) {
      return;
    }
    try {
      await api.cancelLeaveRequest(requestId);
      setSuccessMsg("Leave request cancelled successfully.");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel leave request");
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

  if (isLoading) {
    return <LoadingSpinner text="Retrieving leave balances and history..." />;
  }

  const selectedBal = balances.find((b) => b.leaveTypeId === selectedLeaveTypeId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Leave & Time Off</h1>
          <p className="text-sm text-slate-500 mt-1">
            Statutory allowances, leave request applications, and approval tracking.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenApplyModal}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Apply for Leave
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

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((bal) => (
          <Card key={bal.leaveTypeId} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">{bal.leaveTypeName}</CardTitle>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-brand-700">
                  {bal.isPaid ? "Paid Leave" : "Unpaid"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  {bal.annualQuota > 0 ? bal.remainingDays : "Unlimited"}
                </span>
                <span className="text-xs text-slate-400">
                  {bal.annualQuota > 0 ? `of ${bal.annualQuota} days left` : "quota"}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-600 h-1.5 rounded-full"
                  style={{
                    width: bal.annualQuota > 0 ? `${Math.min(100, (bal.usedDays / bal.annualQuota) * 100)}%` : "0%",
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Used: {bal.usedDays} days</span>
                <span>Annual: {bal.annualQuota > 0 ? `${bal.annualQuota}d` : "None"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Request History Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-brand-600" />
            My Leave Request History ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Policy</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Working Days</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Reviewer & Notes</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No leave requests submitted yet. Click "Apply for Leave" above to request time off.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.leaveTypeName}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.startDate} <span className="text-slate-400">to</span> {r.endDate}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {r.workingDays} {r.workingDays === 1 ? "day" : "days"}
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
                          <span className="text-slate-400">Awaiting review</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelRequest(r.id)}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Apply for Leave Modal */}
      <Dialog isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApplySubmit} className="space-y-4 pt-2">
          {modalError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Leave Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Leave Policy *</label>
            <select
              required
              value={selectedLeaveTypeId}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {balances.map((bal) => (
                <option key={bal.leaveTypeId} value={bal.leaveTypeId}>
                  {bal.leaveTypeName} ({bal.annualQuota > 0 ? `${bal.remainingDays} days available` : "Unlimited"})
                </option>
              ))}
            </select>
            {selectedBal && selectedBal.annualQuota > 0 && (
              <p className="text-[11px] text-slate-500">
                Remaining Allowance: <strong>{selectedBal.remainingDays} days</strong> out of {selectedBal.annualQuota} days annual quota.
              </p>
            )}
          </div>

          {/* Date Range Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Start Date *</label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">End Date *</label>
              <Input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Live Working Day Estimate Preview */}
          {startDate && endDate && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5 text-brand-600" />
                  Calculated Working Days:
                </span>
                <span className="text-sm font-bold font-mono text-brand-700">
                  {isEstimating ? "Calculating..." : `${estimate?.workingDays ?? 0} days`}
                </span>
              </div>
              {estimate && (
                <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between">
                    <span>Total Calendar Span:</span>
                    <span>{estimate.totalCalendarDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Skipped Weekends:</span>
                    <span>{estimate.weekendDaysCount} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Skipped Official Holidays:</span>
                    <span>{estimate.holidayDaysCount} days</span>
                  </div>
                  {estimate.holidaysEncountered.length > 0 && (
                    <div className="text-indigo-600 pt-0.5">
                      Holidays in range: {estimate.holidaysEncountered.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Reason for Request *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide details for your leave request..."
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting || (estimate ? estimate.workingDays <= 0 : false)}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
