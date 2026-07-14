import { formatDate } from '@angular/common';

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function localDateString(date: Date = new Date()): string {
  return formatDate(date, 'yyyy-MM-dd', 'en-US');
}

/** Whole minutes as a compact duration label: "Xm" / "Xh" / "Xh Ym". Empty string for <= 0. */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}
