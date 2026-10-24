import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { AttendanceTodayResponse, AttendanceRecord, AttendanceMonthlyReport } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Clock,
  LogIn,
  LogOut,
  CalendarCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Hourglass,
} from "lucide-react";

export function MyAttendancePage() {
  const [todayData, setTodayData] = useState<AttendanceTodayResponse | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceMonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [punchNotes, setPunchNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live digital clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [todayRes, historyRes] = await Promise.all([
        api.getTodayAttendance(),
        api.getMyAttendanceHistory(),
      ]);
      setTodayData(todayRes);
      setHistory(historyRes.records);
      setSummary(historyRes.summary);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load attendance records");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.checkIn(punchNotes.trim() || undefined);
      setSuccessMsg("Check-in recorded successfully!");
      setPunchNotes("");
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.checkOut(punchNotes.trim() || undefined);
      setSuccessMsg("Check-out recorded successfully!");
      setPunchNotes("");
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record check-out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "PRESENT") {
      return <Badge variant="success">Present</Badge>;
    }
    if (status === "LATE" || isLate) {
      return <Badge variant="warning">Late Arrival</Badge>;
    }
    if (status === "HALF_DAY") {
      return <Badge variant="warning">Half Day</Badge>;
    }
    if (status === "ABSENT") {
      return <Badge variant="destructive">Absent</Badge>;
    }
    if (status === "ON_LEAVE") {
      return <Badge variant="outline">On Leave</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (isLoading) {
    return <LoadingSpinner text="Connecting to attendance ledger..." />;
  }

  const record = todayData?.record;
  const isCheckedIn = Boolean(record?.checkIn);
  const isCheckedOut = Boolean(record?.checkOut);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time daily punch terminal, working hours, and monthly attendance history.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Terminal / Live Punch Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-brand-600" />
              Daily Time Clock Terminal
            </CardTitle>
            <div className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {currentTime.toLocaleTimeString()} UTC
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {/* Status overview bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-xs text-slate-500 block">Check-in</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatTime(record?.checkIn)}
                </span>
                {record?.isLate && (
                  <span className="text-xs font-medium text-amber-600 block mt-0.5">
                    Late by {record.minutesLate}m
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Check-out</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatTime(record?.checkOut)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Work Duration</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {record?.workedMinutes ? formatDuration(record.workedMinutes) : "--:--"}
                </span>
                {record?.status && (
                  <div className="mt-1">{getStatusBadge(record.status, record.isLate)}</div>
                )}
              </div>
            </div>

            {/* Optional Punch Notes */}
            {!isCheckedOut && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Punch Note <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={punchNotes}
                  onChange={(e) => setPunchNotes(e.target.value)}
                  placeholder="e.g. Working from branch office or customer site"
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleCheckIn}
                disabled={isSubmitting || !todayData?.canCheckIn}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isCheckedIn ? "Checked In for Today" : "Check In Now"}
              </Button>

              <Button
                onClick={handleCheckOut}
                disabled={isSubmitting || !todayData?.canCheckOut}
                variant="outline"
                className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-10"
              >
                <LogOut className="mr-2 h-4 w-4 text-rose-600" />
                {isCheckedOut ? "Checked Out" : "Check Out Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary Statistics */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
              <CalendarCheck className="h-5 w-5 mr-2 text-brand-600" />
              Monthly Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Days Present</span>
              <span className="font-bold text-emerald-700 text-sm">{summary?.presentDays || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Late Arrivals</span>
              <span className="font-bold text-amber-600 text-sm">{summary?.lateDays || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Half Days</span>
              <span className="font-bold text-indigo-600 text-sm">{summary?.halfDays || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Recorded Absences</span>
              <span className="font-bold text-rose-600 text-sm">{summary?.absentDays || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Approved Leave Days</span>
              <span className="font-bold text-slate-800 text-sm">{summary?.leaveDays || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-slate-500" />
            Monthly Attendance Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Check-In</th>
                  <th className="px-4 py-3 font-semibold">Check-Out</th>
                  <th className="px-4 py-3 font-semibold">Worked</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No attendance punch records found for this period.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.attendanceDate}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{formatTime(item.checkIn)}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{formatTime(item.checkOut)}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {item.workedMinutes > 0 ? (
                          <span className="flex items-center">
                            <Hourglass className="h-3 w-3 mr-1 text-slate-400" />
                            {formatDuration(item.workedMinutes)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(item.status, item.isLate)}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {item.isCorrected ? (
                          <span className="text-amber-700 italic">
                            [Corrected: {item.correctionReason}]
                          </span>
                        ) : (
                          item.notes || "--"
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
    </div>
  );
}
