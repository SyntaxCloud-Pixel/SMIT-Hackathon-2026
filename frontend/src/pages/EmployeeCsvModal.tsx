import { useState } from "react";
import { api } from "@/services/api";
import {
  CsvImportPreviewResponse,
  CsvImportCommitResponse,
} from "@hcm-lite/shared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  KeyRound,
  Check,
  Copy,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

interface EmployeeCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeCsvModal({
  isOpen,
  onClose,
  onSuccess,
}: EmployeeCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<CsvImportPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<CsvImportCommitResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      "employeeCode",
      "fullName",
      "email",
      "phone",
      "address",
      "departmentName",
      "designationName",
      "employmentType",
      "joiningDate",
      "basicSalary",
    ];
    const sampleRow = [
      "EMP-2001",
      "Arthur Dent",
      "arthur.dent@company.com",
      "+1-555-0144",
      "42 Galaxy Way",
      "Core Engineering",
      "Senior Full Stack Engineer",
      "FULL_TIME",
      "2026-03-01",
      "85000",
    ];

    const csvContent = `${headers.join(",")}\r\n${sampleRow.join(",")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hcm_employee_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg(null);
    setPreviewData(null);
    setCommitResult(null);
    setFile(selected);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsvText(text);
        setParsedRows(rows);

        // Run preview validation immediately
        setIsLoading(true);
        const preview = await api.previewCsvImport(rows);
        setPreviewData(preview);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to parse CSV file");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(selected);
  };

  const parseCsvText = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error("CSV file must have a header row and at least one data row.");

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const dataRows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV splitter handling quotes
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const rowObj: Record<string, string> = {};
      headers.forEach((h, index) => {
        rowObj[h] = values[index] || "";
      });
      dataRows.push(rowObj);
    }
    return dataRows;
  };

  const handleCommit = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await api.commitCsvImport(parsedRows);
      setCommitResult(result);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit employee import");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setPreviewData(null);
    setCommitResult(null);
    setErrorMsg(null);
  };

  const copyPassword = (pwd: string, index: number) => {
    navigator.clipboard.writeText(pwd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import Employees via CSV"
      description="Upload a CSV file to register multiple employees in a single batch."
      className="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Step 1: Download Template Helper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 gap-3">
          <div className="flex items-center space-x-2.5 text-xs text-slate-700">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Need the official column headers and format?</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs shrink-0"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download CSV Template
          </Button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Finished Result View */}
        {commitResult ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <h4 className="text-sm font-semibold text-emerald-900 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-1.5 text-emerald-600" />
                Batch Import Completed
              </h4>
              <p className="text-xs text-emerald-800 mt-1">
                Successfully registered <strong>{commitResult.importedCount}</strong> employees.
                {commitResult.skippedCount > 0 && ` (${commitResult.skippedCount} rows skipped due to validation errors)`}
              </p>
            </div>

            {commitResult.temporaryPasswords && commitResult.temporaryPasswords.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <KeyRound className="h-3.5 w-3.5 mr-1 text-brand-600" />
                  Generated Temporary Passwords ({commitResult.temporaryPasswords.length})
                </h5>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-xs divide-y divide-slate-100 bg-white">
                  {commitResult.temporaryPasswords.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{item.employeeCode}</span>
                        <span className="text-slate-500 ml-2">({item.email})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {item.temporaryPassword}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyPassword(item.temporaryPassword, idx)}
                          className="h-6 px-2 text-[11px]"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Upload Zone */}
            {!previewData && (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-brand-500 transition-colors bg-white text-center cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  Click to select or drag and drop your CSV file
                </p>
                <p className="text-xs text-slate-400 mt-1">Maximum 500 records per upload</p>
              </div>
            )}

            {isLoading && <LoadingSpinner text="Validating CSV rows on server..." />}

            {/* Preview Results Table */}
            {previewData && !isLoading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs">
                    {file && <span className="text-slate-500 font-medium">[{file.name}]</span>}
                    <span className="font-semibold text-slate-700">
                      Total: {previewData.totalRows}
                    </span>
                    <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      {previewData.validRows} Valid
                    </span>
                    {previewData.invalidRows > 0 && (
                      <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                        <XCircle className="h-3 w-3 mr-1 text-rose-600" />
                        {previewData.invalidRows} Invalid
                      </span>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                    Choose Another File
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-semibold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.rows.map((row) => (
                        <tr key={row.rowNumber} className={row.isValid ? "hover:bg-slate-50" : "bg-rose-50/30"}>
                          <td className="px-3 py-2 font-mono text-slate-500">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-mono">{row.employeeCode || "—"}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{row.fullName || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.email || "—"}</td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="text-emerald-700 font-medium">Ready</span>
                            ) : (
                              <span className="text-rose-600 font-medium" title={row.errors.join("; ")}>
                                {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {previewData.validRows === 0
                      ? "Fix errors in your CSV file before importing."
                      : `${previewData.validRows} valid employees will be registered.`}
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      disabled={previewData.validRows === 0}
                      onClick={handleCommit}
                      isLoading={isLoading}
                    >
                      Confirm Import ({previewData.validRows})
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
