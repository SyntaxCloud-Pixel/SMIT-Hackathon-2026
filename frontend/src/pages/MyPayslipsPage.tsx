import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { PayrollItem } from "@hcm-lite/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  CreditCard,
  RotateCcw,
  Eye,
  Printer,
  ShieldCheck,
  Building2,
  FileCheck,
} from "lucide-react";

export function MyPayslipsPage() {
  const { company } = useAuth();
  const [payslips, setPayslips] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected payslip for modal view
  const [selectedSlip, setSelectedSlip] = useState<PayrollItem | null>(null);

  const fetchPayslips = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getMyPayslips();
      setPayslips(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load your salary slips");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

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

  if (isLoading && payslips.length === 0) {
    return <LoadingSpinner text="Retrieving your official salary slips..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Payslips</h1>
          <p className="text-sm text-slate-500 mt-1">
            Access, view, and print your official itemized monthly salary statements and tax withholding slips.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchPayslips} disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Payslips Table */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-600" />
            Disbursed Payslips ({payslips.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payslips.length === 0 ? (
            <div className="p-12 text-center">
              <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No Payslips Released Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once HR finalizes a monthly payroll cycle, your itemized payslip will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Basic Pay</th>
                    <th className="py-3 px-4">Allowances</th>
                    <th className="py-3 px-4">Gross Earnings</th>
                    <th className="py-3 px-4">Deductions & Tax</th>
                    <th className="py-3 px-4">Net Disbursed</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payslips.map((p) => {
                    const allowances = (p.hra || 0) + (p.medicalAllowance || 0);
                    const totalDeductions = (p.absentDeduction || 0) + (p.unpaidLeaveDeduction || 0) + (p.taxWithholding || 0);
                    const month = (p as any).month;
                    const year = (p as any).year;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {month ? `${monthNames[month - 1]} ${year}` : "Monthly Cycle"}
                          <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Disbursed
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{formatPKR(p.basicSalary)}</td>
                        <td className="py-3 px-4 text-slate-600">+{formatPKR(allowances)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatPKR(p.grossSalary)}</td>
                        <td className="py-3 px-4 text-rose-600">-{formatPKR(totalDeductions)}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{formatPKR(p.netSalary)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-brand-600 hover:text-brand-700"
                            onClick={() => setSelectedSlip(p)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Slip
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Official Payslip Modal */}
      <Dialog
        isOpen={Boolean(selectedSlip)}
        onClose={() => setSelectedSlip(null)}
        title="Official Monthly Payslip"
      >
        {selectedSlip && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Pay Stub Paper Card */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-800 space-y-4 print:p-0 print:border-none print:shadow-none">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900">{company?.name || "HCM Lite"}</h2>
                    <p className="text-[11px] text-slate-500">Official Monthly Earnings Statement</p>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="h-3 w-3 mr-1 inline" />
                    Verified & Disbursed
                  </Badge>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cycle: {(selectedSlip as any).month ? `${monthNames[(selectedSlip as any).month - 1]} ${(selectedSlip as any).year}` : "Monthly"}
                  </p>
                </div>
              </div>

              {/* Employee Information */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Employee Name</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedSlip.employeeName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Employee ID</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedSlip.employeeCode}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Department</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedSlip.departmentName || "Engineering"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Designation</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedSlip.designationName || "Specialist"}</p>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Earnings
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Basic Pay</span>
                      <span className="font-semibold text-slate-900">{formatPKR(selectedSlip.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">House Rent Allowance (HRA 40%)</span>
                      <span className="font-semibold text-slate-900">{formatPKR(selectedSlip.hra)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Medical Allowance (10%)</span>
                      <span className="font-semibold text-slate-900">{formatPKR(selectedSlip.medicalAllowance)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Gross Pay (150%)</span>
                      <span className="text-brand-600">{formatPKR(selectedSlip.grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Deductions & Withholdings
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Absent Days ({selectedSlip.absentDays} day{selectedSlip.absentDays === 1 ? "" : "s"})
                      </span>
                      <span className="font-semibold text-rose-600">
                        {selectedSlip.absentDeduction > 0 ? `-${formatPKR(selectedSlip.absentDeduction)}` : "PKR 0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Unpaid Leave ({selectedSlip.unpaidLeaveDays} day{selectedSlip.unpaidLeaveDays === 1 ? "" : "s"})
                      </span>
                      <span className="font-semibold text-rose-600">
                        {selectedSlip.unpaidLeaveDeduction > 0 ? `-${formatPKR(selectedSlip.unpaidLeaveDeduction)}` : "PKR 0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Income Tax (Statutory Slab)</span>
                      <span className="font-semibold text-rose-600">
                        {selectedSlip.taxWithholding > 0 ? `-${formatPKR(selectedSlip.taxWithholding)}` : "PKR 0.00"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-rose-700">
                      <span>Total Deductions</span>
                      <span>
                        -{formatPKR(
                          (selectedSlip.absentDeduction || 0) +
                          (selectedSlip.unpaidLeaveDeduction || 0) +
                          (selectedSlip.taxWithholding || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-800">Net Take-Home Disbursed</span>
                  <p className="text-[11px] text-emerald-600">Transferred via direct company bank deposit</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-emerald-700">{formatPKR(selectedSlip.netSalary)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Print Payslip
              </Button>

              <Button
                size="sm"
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs"
                onClick={() => setSelectedSlip(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
