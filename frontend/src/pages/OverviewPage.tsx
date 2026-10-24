import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { DashboardSummary } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Users,
  CalendarCheck,
  CalendarOff,
  CreditCard,
  RotateCcw,
  Bot,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

export function OverviewPage() {
  const { user, company } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load dashboard summary", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatPKR = (amount: number) => {
    return `PKR ${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (isLoading && !summary) {
    return <LoadingSpinner text="Loading enterprise dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="border-indigo-400/40 text-indigo-300 bg-indigo-950/40">
              HCM Lite Enterprise Suite
            </Badge>
            <span className="text-xs text-slate-400">• Saylani Hackathon</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            You are operating with <span className="text-brand-300 font-semibold">{user?.role}</span> permissions
            for <span className="text-white font-semibold">{company?.name || "HCM Lite"}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalEmployees}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Active workforce staff</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-brand-600 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.attendanceRate}%</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {summary.presentToday} present ({summary.lateToday} late)
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{summary.pendingLeaves}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{summary.onLeaveToday} on leave today</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CalendarOff className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Net Payroll</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatPKR(summary.lastPayrollTotal)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Disbursed to employees</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/my-attendance"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">Attendance Terminal</h3>
          <p className="text-xs text-slate-500 mt-1">Clock in/out with GPS radius verification</p>
        </Link>

        <Link
          to="/my-leaves"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CalendarOff className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">Leave Portal</h3>
          <p className="text-xs text-slate-500 mt-1">Check balances and submit requests</p>
        </Link>

        <Link
          to="/ai-assistant"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Bot className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">AI HR Helpdesk</h3>
          <p className="text-xs text-slate-500 mt-1">Ask questions about policies and data</p>
        </Link>

        <Link
          to="/announcements"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Megaphone className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">Announcements</h3>
          <p className="text-xs text-slate-500 mt-1">Read official bulletins and policies</p>
        </Link>
      </div>

      {/* System Trust & Verified Modules */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified Core Modules & System Integrity
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
              All Modules Operational
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Building2 className="h-4 w-4 text-brand-600" />
                <span>Workforce & Organization</span>
              </div>
              <p className="text-slate-500 mt-1 text-[11px]">
                Department hierarchy, job titles, public holidays, and staff management with role-based security.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                <span>Attendance & Leave Flow</span>
              </div>
              <p className="text-slate-500 mt-1 text-[11px]">
                Daily clock in/out with grace period, working days deduction calculation, and approval routing.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <span>Automated Payroll & Slips</span>
              </div>
              <p className="text-slate-500 mt-1 text-[11px]">
                HRA, medical allowances, absent deductions, Pakistani progressive tax brackets, and itemized pay stubs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
