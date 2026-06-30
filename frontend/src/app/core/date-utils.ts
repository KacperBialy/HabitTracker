import { formatDate } from '@angular/common';

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function localDateString(date: Date = new Date()): string {
  return formatDate(date, 'yyyy-MM-dd', 'en-US');
}
