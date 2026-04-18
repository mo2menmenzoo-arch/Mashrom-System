import { addDays, differenceInCalendarDays } from "date-fns";

export const CYCLE_LENGTH_DAYS = 60;

export function computeCycleEnd(start: Date): Date {
  return addDays(start, CYCLE_LENGTH_DAYS);
}

export function cycleDayNumber(start: Date, on: Date = new Date()): number {
  const day = differenceInCalendarDays(on, start) + 1;
  if (day < 1) return 0;
  if (day > CYCLE_LENGTH_DAYS) return CYCLE_LENGTH_DAYS;
  return day;
}

export function cycleProgress(start: Date, on: Date = new Date()): number {
  return Math.round((cycleDayNumber(start, on) / CYCLE_LENGTH_DAYS) * 100);
}
