import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { PayrollRun, PayrollRunDetail } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  CreditCard,
  Plus,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  ShieldCheck,
} from "lucide-react";

export function PayrollManagementPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Generate Draft Modal
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState<number>(new Date().getMonth() + 1);
  const [draftYear, setDraftYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Detail Modal
  const [selectedRun, setSelectedRun] = useState<PayrollRunDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Finalize Confirmation Modal
  const [runToFinalize, setRunToFinalize] = useState<PayrollRun | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const fetchRuns = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getPayrollRuns();
      setRuns(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load payroll runs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const detail = await api.generatePayrollDraft(draftMonth, draftYear);
      setSuccessMsg(`Payroll draft generated for ${draftMonth}/${draftYear} with ${detail.employeeCount} staff lines.`);
      setIsDraftModalOpen(false);
      await fetchRuns();
      setSelectedRun(detail);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate draft");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenDetail = async (run: PayrollRun) => {
    setIsLoadingDetail(true);
    setErrorMsg(null);
    try {
      const detail = await api.getPayrollRunDetail(run.id);
      setSelectedRun(detail);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load run details");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleFinalize = async () => {
    if (!runToFinalize) return;
    setIsFinalizing(true);
    setErrorMsg(null);
    try {
      await api.finalizePayrollRun(runToFinalize.id);
      setSuccessMsg(`Payroll for ${runToFinalize.month}/${runToFinalize.year} has been locked, finalized, and payslips released.`);
      setRunToFinalize(null);
      if (selectedRun?.id === runToFinalize.id) {
        setSelectedRun(null);
      }
      await fetchRuns();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize payroll run");
    } finally {
      setIsFinalizing(false);
    }
  };

  const formatPKR = (amount: number) => {
    return `PKR ${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (isLoading && runs.length === 0) {
    return <LoadingSpinner text="Loading payroll cycles and disbursement history..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated statutory tax deduction, gross allowances (HRA & Medical), and payslip disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRuns} disabled={isLoading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => setIsDraftModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Generate Payroll Draft
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Success:</span> {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Runs Table */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-600" />
              Monthly Payroll Cycles ({runs.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No Payroll Cycles Generated</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Generate your first monthly payroll draft to calculate gross wages, allowances, absent deductions, and statutory tax.
              </p>
              <Button
                size="sm"
                className="mt-4 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => setIsDraftModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Payroll Draft
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Staff Count</th>
                    <th className="py-3 px-4 text-right">Total Gross</th>
                    <th className="py-3 px-4 text-right">Total Deductions</th>
                    <th className="py-3 px-4 text-right">Net Payout</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {monthNames[r.month - 1]} {r.year}
                      </td>
                      <td className="py-3 px-4">
                        {r.status === "FINALIZED" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <ShieldCheck className="h-3 w-3 mr-1 inline" />
                            Finalized & Released
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Draft Review
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{r.employeeCount}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatPKR(r.totalGross)}</td>
                      <td className="py-3 px-4 text-right text-rose-600 font-medium">-{formatPKR(r.totalDeductions)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatPKR(r.totalNet)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-slate-700 hover:text-brand-600"
                            onClick={() => handleOpenDetail(r)}
                            disabled={isLoadingDetail}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Breakdown
                          </Button>

                          <a
                            href={api.getPayrollExportCsvUrl(r.id)}
                            download
                            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            title="Export CSV"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                            CSV
                          </a>

                          {r.status === "DRAFT" && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => setRunToFinalize(r)}
                            >
                              Finalize
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Draft Modal */}
      <Dialog
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        title="Generate Monthly Payroll Draft"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            Select the target calendar month and year. The system will calculate basic salary, HRA (40%), medical (10%), gross pay, absent deductions, and statutory Pakistani progressive income tax.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
              <select
                value={draftMonth}
                onChange={(e) => setDraftMonth(parseInt(e.target.value, 10))}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name} ({i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="number"
                value={draftYear}
                onChange={(e) => setDraftYear(parseInt(e.target.value, 10))}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsDraftModalOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleGenerateDraft}
              disabled={isGenerating}
            >
              {isGenerating ? "Calculating Wages..." : "Generate Draft"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Itemized Detail Modal */}
      <Dialog
        isOpen={Boolean(selectedRun)}
        onClose={() => setSelectedRun(null)}
        title={
          selectedRun
            ? `Payroll Breakdown — ${monthNames[selectedRun.month - 1]} ${selectedRun.year} (${selectedRun.status})`
            : "Payroll Breakdown"
        }
      >
        {selectedRun && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* KPI Banner */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Gross</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{formatPKR(selectedRun.totalGross)}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Deductions</span>
                <p className="text-sm font-bold text-rose-600 mt-0.5">-{formatPKR(selectedRun.totalDeductions)}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Net Payout</span>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatPKR(selectedRun.totalNet)}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Basic</th>
                    <th className="py-2.5 px-3">HRA (40%)</th>
                    <th className="py-2.5 px-3">Medical (10%)</th>
                    <th className="py-2.5 px-3 font-bold">Gross (150%)</th>
                    <th className="py-2.5 px-3">Days (Pres/Abs)</th>
                    <th className="py-2.5 px-3">Absent Ded.</th>
                    <th className="py-2.5 px-3">Tax Withheld</th>
                    <th className="py-2.5 px-3 font-bold text-emerald-700">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRun.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {it.employeeName}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {it.employeeCode} • {it.departmentName || "No Dept"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">{formatPKR(it.basicSalary)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatPKR(it.hra)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatPKR(it.medicalAllowance)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{formatPKR(it.grossSalary)}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {it.presentDays}P / {it.absentDays}A
                      </td>
                      <td className="py-2.5 px-3 text-rose-600">
                        {it.absentDeduction > 0 ? `-${formatPKR(it.absentDeduction)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600">
                        {it.taxWithholding > 0 ? `-${formatPKR(it.taxWithholding)}` : "PKR 0.00"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">{formatPKR(it.netSalary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={api.getPayrollExportCsvUrl(selectedRun.id)}
                download
                className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                Download Full CSV Report
              </a>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedRun(null)}>
                  Close
                </Button>
                {selectedRun.status === "DRAFT" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setRunToFinalize(selectedRun);
                    }}
                  >
                    Finalize & Release
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Finalize Confirmation Modal */}
      <Dialog
        isOpen={Boolean(runToFinalize)}
        onClose={() => setRunToFinalize(null)}
        title="Confirm Payroll Finalization"
      >
        {runToFinalize && (
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Permanent Operation:</span> Once finalized, this payroll run becomes{" "}
                <span className="font-semibold underline">completely immutable</span>. Line items cannot be recomputed, and notifications will be sent to all employees to view their official monthly payslips.
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to finalize payroll for{" "}
              <span className="font-semibold text-slate-900">
                {monthNames[runToFinalize.month - 1]} {runToFinalize.year}
              </span>{" "}
              with a net disbursement of <span className="font-bold text-emerald-700">{formatPKR(runToFinalize.totalNet)}</span>?
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setRunToFinalize(null)} disabled={isFinalizing}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? "Finalizing & Releasing..." : "Confirm Finalize"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
