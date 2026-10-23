// Calendar periods for the dashboard, all in UTC. Weeks start on Monday,
// matching `$dateTrunc` with `startOfWeek: "monday"`.

export const dashboardPeriods = ["day", "week", "month", "year"];

// * how far back a trend may go, per interval
export const maxTrendCount = { day: 90, week: 52, month: 24, year: 10 };

export const defaultTrendCount = { day: 7, week: 12, month: 12, year: 5 };

export const startOfPeriod = (date, period) => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  if (period === "week") {
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  }

  if (period === "month") {
    start.setUTCDate(1);
  }

  // > year to date starts on 1 January
  if (period === "year") {
    start.setUTCMonth(0, 1);
  }

  return start;
};

// ! only call with a period start, so month shifts never overflow (Jan 31 + 1 month)
export const shiftPeriod = (periodStart, period, amount) => {
  const shifted = new Date(periodStart);

  if (period === "day") shifted.setUTCDate(shifted.getUTCDate() + amount);
  if (period === "week") shifted.setUTCDate(shifted.getUTCDate() + 7 * amount);
  if (period === "month") shifted.setUTCMonth(shifted.getUTCMonth() + amount);
  if (period === "year")
    shifted.setUTCFullYear(shifted.getUTCFullYear() + amount);

  return shifted;
};

// > the period containing `anchor`, cut off at `now` while it is still running,
// plus the same stretch of the period before it for a like-for-like comparison
export const getPeriodRange = (
  period,
  anchor = new Date(),
  now = new Date()
) => {
  const from = startOfPeriod(anchor, period);
  const end = shiftPeriod(from, period, 1);
  const isComplete = end <= now;
  const to = isComplete ? end : now;

  const previousFrom = shiftPeriod(from, period, -1);
  const previousTo = isComplete
    ? from
    : new Date(Math.min(previousFrom.getTime() + (to - from), from.getTime()));

  return {
    range: { from, to, isComplete },
    previousRange: { from: previousFrom, to: previousTo },
  };
};

// < `count` consecutive periods ending with the one containing `anchor`
export const getTrendBuckets = (
  interval,
  count,
  anchor = new Date(),
  now = new Date()
) => {
  const last = startOfPeriod(anchor, interval);
  const first = shiftPeriod(last, interval, -(count - 1));
  const end = shiftPeriod(last, interval, 1);

  const buckets = Array.from({ length: count }, (_, index) =>
    shiftPeriod(first, interval, index)
  );

  return { buckets, from: first, to: end < now ? end : now };
};
