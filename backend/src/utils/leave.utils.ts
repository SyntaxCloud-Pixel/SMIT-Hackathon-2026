import { Holiday, WorkingDaysEstimateResponse } from '@hcm-lite/shared';
import { isWeekend, isHoliday } from './attendance.utils';

export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  weekendDays: string[] = ['Saturday', 'Sunday'],
  holidays: Holiday[] = []
): WorkingDaysEstimateResponse {
  const start = new Date(startDateStr + 'T00:00:00.000Z');
  const end = new Date(endDateStr + 'T00:00:00.000Z');

  let workingDays = 0;
  let totalCalendarDays = 0;
  let weekendDaysCount = 0;
  let holidayDaysCount = 0;
  const holidaysEncountered: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    totalCalendarDays++;
    const currentStr = current.toISOString().slice(0, 10);

    const isWknd = isWeekend(current, weekendDays);
    const holidayMatch = holidays.find((h) => h.holidayDate === currentStr);

    if (isWknd) {
      weekendDaysCount++;
    } else if (holidayMatch) {
      holidayDaysCount++;
      holidaysEncountered.push(`${holidayMatch.name} (${currentStr})`);
    } else {
      workingDays++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    workingDays,
    totalCalendarDays,
    weekendDaysCount,
    holidayDaysCount,
    holidaysEncountered,
  };
}

export function hasLeaveOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && endA >= startB;
}
