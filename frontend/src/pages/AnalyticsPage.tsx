import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { DashboardSummary, AttendanceAnalyticsTrend } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Users,
  CalendarCheck,
  CalendarOff,
  CreditCard,
  RotateCcw,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export function AnalyticsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<AttendanceAnalyticsTrend[]>([]);
  const [timeframeDays, setTimeframeDays] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [sumData, trendData] = await Promise.all([
        api.getDashboardSummary(),
        api.getAttendanceTrends(timeframeDays),
      ]);
      setSummary(sumData);
      setTrends(trendData);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load workforce analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframeDays]);

  const formatPKR = (amount: number) => {
    return `PKR ${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (isLoading && !summary) {
    return <LoadingSpinner text="Computing workforce metrics and analytics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workforce Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time aggregate data, attendance ratios, and department headcount distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setTimeframeDays(7)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeframeDays === 7 ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframeDays(14)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeframeDays === 14 ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setTimeframeDays(30)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeframeDays === 30 ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 Days
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Headcount</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalEmployees}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Across all company departments</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-brand-600 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.attendanceRate}%</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {summary.presentToday} present today ({summary.lateToday} late)
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leave Inquiries</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{summary.pendingLeaves}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{summary.onLeaveToday} staff on leave today</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CalendarOff className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Net Payroll</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatPKR(summary.lastPayrollTotal)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Disbursed to verified workforce</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              Daily Attendance Trends ({timeframeDays} Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#presentGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    name="Late Arrivals"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#lateGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-600" />
              Staff Headcount by Department
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72 w-full">
              {summary && summary.departmentHeadcounts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.departmentHeadcounts}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="departmentName" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        borderRadius: "8px",
                        fontSize: "12px",
                        border: "none",
                      }}
                    />
                    <Bar dataKey="count" name="Employees" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No department distribution data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
