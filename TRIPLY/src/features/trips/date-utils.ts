export type CalendarDay = { date: Date; inMonth: boolean };

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isSameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getTime() === b.getTime();
}

// Inclusive day count: Oct 12 – Oct 18 is 7 days.
export function daysBetween(start: Date, end: Date) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1;
}

// Weeks (Sun–Sat) covering the month, padded with neighbouring-month days.
export function buildMonthWeeks(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const gridStart = addDays(first, -first.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7);

  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(gridStart, week * 7 + day);
      return { date, inMonth: date.getMonth() === month };
    }),
  );
}

export function formatMonthTitle(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatFullDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Local calendar date as YYYY-MM-DD (not UTC, so the day the user picked is preserved).
export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Parses YYYY-MM-DD as a local date (new Date("YYYY-MM-DD") would be UTC and can shift a day).
export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
