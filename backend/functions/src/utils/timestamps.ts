import { Timestamp } from 'firebase-admin/firestore';

export function getUTCDayStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function getUTCWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function getNextUTCDayStart(date: Date = new Date()): Date {
  const d = getUTCDayStart(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function getNextUTCWeekStart(date: Date = new Date()): Date {
  const d = getUTCWeekStart(date);
  d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

export function normalizeDate(input: Timestamp | Date | string | number | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Timestamp) {
    return input.toDate();
  }
  if (input instanceof Date) {
    return input;
  }
  if (typeof input === 'number') {
    return new Date(input);
  }
  return new Date(input);
}

export function hasTimestampPassed(timestamp: Timestamp | Date | string | number | undefined | null, now: Date = new Date()): boolean {
  if (!timestamp) return true;
  const date = normalizeDate(timestamp);
  return date.getTime() <= now.getTime();
}

export function toFirestoreTimestamp(date: Date = new Date()): Timestamp {
  return Timestamp.fromDate(date);
}
