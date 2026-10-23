import {
  getPeriodRange,
  getTrendBuckets,
  shiftPeriod,
  startOfPeriod,
} from "../utils/dateRange.js";

const utc = iso => new Date(`${iso}Z`);
const isoOf = date => date.toISOString().replace(".000Z", "");
const isOf = ({ from, to }) => [isoOf(from), isoOf(to)];

// # calendar period starts, in UTC with Monday-first weeks
describe("startOfPeriod", () => {
  // ? 2026-10-23 is a Friday
  const friday = utc("2026-10-23T15:30:00");

  test("day starts at midnight", () => {
    expect(isoOf(startOfPeriod(friday, "day"))).toBe("2026-10-23T00:00:00");
  });

  test("week starts on the Monday before", () => {
    expect(isoOf(startOfPeriod(friday, "week"))).toBe("2026-10-19T00:00:00");
  });

  // ? Sunday belongs to the week that started six days earlier, not the next one
  test("a Sunday belongs to the week that started the Monday before", () => {
    expect(isoOf(startOfPeriod(utc("2026-10-25T23:59:59"), "week"))).toBe(
      "2026-10-19T00:00:00"
    );
  });

  test("month starts on the 1st", () => {
    expect(isoOf(startOfPeriod(friday, "month"))).toBe("2026-10-01T00:00:00");
  });

  test("year starts on 1 January", () => {
    expect(isoOf(startOfPeriod(friday, "year"))).toBe("2026-01-01T00:00:00");
  });
});

// # moving between periods
describe("shiftPeriod", () => {
  // ? months have different lengths; starting from the 1st keeps shifts exact
  test("moves across month and year boundaries", () => {
    expect(isoOf(shiftPeriod(utc("2026-01-01T00:00:00"), "month", -1))).toBe(
      "2025-12-01T00:00:00"
    );
    expect(isoOf(shiftPeriod(utc("2026-01-01T00:00:00"), "month", 1))).toBe(
      "2026-02-01T00:00:00"
    );
  });
});

// # the reporting window and what it is compared with
describe("getPeriodRange", () => {
  const now = utc("2026-10-23T15:00:00");

  // ? the running week stops at now and is compared with the same stretch of last week
  test("a running period ends now and compares like for like", () => {
    const { range, previousRange } = getPeriodRange("week", now, now);

    expect(isoOf(range.from)).toBe("2026-10-19T00:00:00");
    expect(isoOf(range.to)).toBe("2026-10-23T15:00:00");
    expect(range.isComplete).toBe(false);
    expect(isoOf(previousRange.from)).toBe("2026-10-12T00:00:00");
    expect(isoOf(previousRange.to)).toBe("2026-10-16T15:00:00");
  });

  // ? a finished month is compared with the whole month before it
  test("a past period is complete and compares whole periods", () => {
    const { range, previousRange } = getPeriodRange(
      "month",
      utc("2026-09-10T00:00:00"),
      now
    );

    expect(isoOf(range.from)).toBe("2026-09-01T00:00:00");
    expect(isoOf(range.to)).toBe("2026-10-01T00:00:00");
    expect(range.isComplete).toBe(true);
    expect(isoOf(previousRange.from)).toBe("2026-08-01T00:00:00");
    expect(isoOf(previousRange.to)).toBe("2026-09-01T00:00:00");
  });

  // ? year to date runs from 1 Jan to now, against the same stretch of last year
  test("year to date compares with the same days of last year", () => {
    const { range, previousRange } = getPeriodRange("year", now, now);

    expect(isoOf(range.from)).toBe("2026-01-01T00:00:00");
    expect(isoOf(range.to)).toBe("2026-10-23T15:00:00");
    expect(isOf(previousRange)).toEqual([
      "2025-01-01T00:00:00",
      "2025-10-23T15:00:00",
    ]);
  });

  // ? on Mar 31 the previous month (Feb) is shorter, so the comparison stops at Feb's end
  test("the comparison never runs past the start of the current period", () => {
    const marchEnd = utc("2026-03-31T12:00:00");
    const { previousRange } = getPeriodRange("month", marchEnd, marchEnd);

    expect(isoOf(previousRange.from)).toBe("2026-02-01T00:00:00");
    expect(isoOf(previousRange.to)).toBe("2026-03-01T00:00:00");
  });
});

// # trend buckets
describe("getTrendBuckets", () => {
  const now = utc("2026-10-23T15:00:00");

  // ? oldest first, ending with the running period, which stops at now
  test("lists `count` periods ending with the current one", () => {
    const { buckets, from, to } = getTrendBuckets("month", 3, now, now);

    expect(buckets.map(isoOf)).toEqual([
      "2026-08-01T00:00:00",
      "2026-09-01T00:00:00",
      "2026-10-01T00:00:00",
    ]);
    expect(isoOf(from)).toBe("2026-08-01T00:00:00");
    expect(isoOf(to)).toBe("2026-10-23T15:00:00");
  });

  // ? anchored in the past, the last bucket is a whole period
  test("ends at the end of the last period when anchored in the past", () => {
    const { buckets, to } = getTrendBuckets(
      "day",
      2,
      utc("2026-10-01T08:00:00"),
      now
    );

    expect(buckets.map(isoOf)).toEqual([
      "2026-09-30T00:00:00",
      "2026-10-01T00:00:00",
    ]);
    expect(isoOf(to)).toBe("2026-10-02T00:00:00");
  });
});
