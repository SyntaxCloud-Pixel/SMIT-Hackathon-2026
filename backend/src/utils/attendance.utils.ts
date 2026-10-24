import { AttendanceRecord, AttendanceStatus, Company, Holiday } from '@hcm-lite/shared';

export interface AttendanceEvaluationResult {
  status: AttendanceStatus;
  isLate: boolean;
  minutesLate: number;
  workedMinutes: number;
}

/**
 * Parses time string "HH:MM" or "HH:MM:SS" into hours and minutes
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  return {
    hours: parts[0] || 9,
    minutes: parts[1] || 0,
  };
}

/**
 * Returns YYYY-MM-DD string for a given date in the company's timezone (or UTC fallback)
 */
export function getCompanyLocalDateString(date: Date = new Date(), _timezone: string = 'UTC'): string {
  // ISO date format YYYY-MM-DD
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a given date is a configured weekend day for the company
 */
export function isWeekend(date: Date, weekendDays: string[] = ['Saturday', 'Sunday']): boolean {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getUTCDay()];
  return weekendDays.some((w) => w.toLowerCase() === dayName.toLowerCase());
}

/**
 * Checks whether a date matches any declared public/company holiday
 */
export function isHoliday(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some((h) => h.holidayDate === dateStr);
}

/**
 * Evaluates check-in arrival time against company office start time and grace period.
 * 
 * Boundary Rule:
 * Office start: 09:00. Grace period: 15 mins.
 * A check-in at or before 09:15:00 is ON-TIME (not late).
 * A check-in after 09:15:00 (e.g. 09:15:01 / 09:16) is LATE.
 */
export function evaluateCheckIn(
  checkInDate: Date,
  company: Company
): { isLate: boolean; minutesLate: number; status: AttendanceStatus } {
  const { hours: officeHours, minutes: officeMins } = parseTimeString(company.officeStartTime || '09:00:00');
  const graceMinutes = company.gracePeriodMinutes ?? 15;

  // Compute scheduled start boundary in UTC minutes from midnight
  const scheduledMinutes = officeHours * 60 + officeMins;
  const actualMinutes = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes();
  const actualSeconds = checkInDate.getUTCSeconds();

  // If actual time is strictly after (officeStartTime + gracePeriod), calculate minutes late
  const graceThresholdSeconds = (scheduledMinutes + graceMinutes) * 60;
  const actualTotalSeconds = actualMinutes * 60 + actualSeconds;

  if (actualTotalSeconds > graceThresholdSeconds) {
    const rawDiffMinutes = Math.ceil((actualTotalSeconds - scheduledMinutes * 60) / 60);
    return {
      isLate: true,
      minutesLate: Math.max(1, rawDiffMinutes),
      status: 'LATE',
    };
  }

  return {
    isLate: false,
    minutesLate: 0,
    status: 'PRESENT',
  };
}

/**
 * Evaluates full day duration and final primary status upon check-out.
 * Half-Day Rule:
 * If total worked time is strictly less than 300 minutes (5 hours),
 * the primary status is HALF_DAY, while keeping isLate preserved.
 */
export function evaluateCheckOut(
  checkInDate: Date,
  checkOutDate: Date,
  initialIsLate: boolean,
  initialMinutesLate: number
): AttendanceEvaluationResult {
  const diffMs = checkOutDate.getTime() - checkInDate.getTime();
  const workedMinutes = Math.max(0, Math.round(diffMs / 60000));

  let finalStatus: AttendanceStatus = initialIsLate ? 'LATE' : 'PRESENT';

  if (workedMinutes < 300) {
    finalStatus = 'HALF_DAY';
  }

  return {
    status: finalStatus,
    isLate: initialIsLate,
    minutesLate: initialMinutesLate,
    workedMinutes,
  };
}
