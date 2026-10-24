import { useState, useEffect } from "react";
import { AttendanceRecord, AttendanceStatus } from "@hcm-lite/shared";
import { api } from "@/services/api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: AttendanceRecord | null;
}

export function AttendanceCorrectionModal({
  isOpen,
  onClose,
  onSuccess,
  record,
}: AttendanceCorrectionModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>("PRESENT");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setCheckInTime(
        record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ""
      );
      setCheckOutTime(
        record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ""
      );
      setCorrectionReason("");
      setErrorMsg(null);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (correctionReason.trim().length < 5) {
      setErrorMsg("A detailed correction justification (minimum 5 characters) is required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Build ISO timestamps based on attendanceDate
      let isoCheckIn: string | null = record.checkIn || null;
      let isoCheckOut: string | null = record.checkOut || null;

      if (checkInTime) {
        isoCheckIn = new Date(`${record.attendanceDate}T${checkInTime}:00Z`).toISOString();
      } else {
        isoCheckIn = null;
      }

      if (checkOutTime) {
        isoCheckOut = new Date(`${record.attendanceDate}T${checkOutTime}:00Z`).toISOString();
      } else {
        isoCheckOut = null;
      }

      await api.correctAttendance(record.id, {
        status,
        checkIn: isoCheckIn,
        checkOut: isoCheckOut,
        correctionReason: correctionReason.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update attendance record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Administrative Attendance Correction">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start space-x-2 text-xs text-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            This action creates a permanent administrative audit entry. Historical punches and timestamps will be updated.
          </span>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Employee Summary Card */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Employee:</span>
            <span className="font-semibold text-slate-900">{record.employeeName} ({record.employeeCode})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Attendance Date:</span>
            <span className="font-semibold text-slate-900">{record.attendanceDate}</span>
          </div>
        </div>

        {/* Attendance Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Attendance Classification *</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="PRESENT">PRESENT - Standard Full Day</option>
            <option value="LATE">LATE - Delayed Arrival</option>
            <option value="HALF_DAY">HALF_DAY - Less than 5 Hours</option>
            <option value="ABSENT">ABSENT - Unexcused Absence</option>
            <option value="ON_LEAVE">ON_LEAVE - Approved Absence</option>
            <option value="HOLIDAY">HOLIDAY - Official Calendar Holiday</option>
            <option value="WEEKEND">WEEKEND - Scheduled Weekend</option>
          </select>
        </div>

        {/* Punch Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Check-in Time (24h)</label>
            <Input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Check-out Time (24h)</label>
            <Input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Mandatory Correction Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Justification & Reason * <span className="text-slate-400 font-normal">(Min 5 characters)</span>
          </label>
          <textarea
            required
            rows={3}
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            placeholder="e.g. Card reader was offline during morning shift, adjusted punch time as verified by supervisor."
            className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isLoading}>
            {isLoading ? "Saving Correction..." : "Apply Correction"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
