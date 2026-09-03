import { describe, expect, it } from "vitest";
import { createDefaultData } from "./defaults";
import {
  applyMonthlyRollover,
  createBackup,
  fixedTotal,
  parseBackup,
  remainingBalance,
  startingSpendable,
  subscriptionTotal,
  variableTotal,
} from "./domain";
import type { Transaction } from "./types";

const purchase = (
  id: string,
  cents: number,
  date = "2026-08-12",
): Transaction => ({
  id,
  amountCents: cents,
  categoryId: "groceries",
  date,
  merchant: "Test merchant",
  createdAt: `${date}T12:00:00.000Z`,
  updatedAt: `${date}T12:00:00.000Z`,
});

describe("budget calculations", () => {
  it("matches all supplied starting totals", () => {
    const data = createDefaultData(new Date("2026-08-10T12:00:00"));
    expect(fixedTotal(data)).toBe(196665);
    expect(subscriptionTotal(data)).toBe(11303);
    expect(startingSpendable(data)).toBe(87032);
    expect(remainingBalance(data)).toBe(87032);
  });

  it("subtracts additions, edits, and deletions exactly in cents", () => {
    const data = createDefaultData(new Date("2026-08-10T12:00:00"));
    data.transactions = [purchase("one", 1234), purchase("two", 999)];
    expect(variableTotal(data.transactions)).toBe(2233);
    expect(remainingBalance(data)).toBe(84799);
    data.transactions = data.transactions.map((item) =>
      item.id === "one" ? { ...item, amountCents: 2000 } : item,
    );
    expect(remainingBalance(data)).toBe(84033);
    data.transactions = data.transactions.filter((item) => item.id !== "two");
    expect(remainingBalance(data)).toBe(85032);
  });
});

describe("monthly rollover", () => {
  it("archives once and starts the new month with no purchases or rollover", () => {
    const data = createDefaultData(new Date("2026-07-10T12:00:00"));
    data.transactions = [purchase("one", 5000, "2026-07-12")];
    const rolled = applyMonthlyRollover(data, "2026-08");
    expect(rolled.activeMonth).toBe("2026-08");
    expect(rolled.transactions).toEqual([]);
    expect(rolled.archives).toHaveLength(1);
    expect(rolled.archives[0].transactions).toHaveLength(1);
    expect(remainingBalance(rolled)).toBe(87032);
    expect(applyMonthlyRollover(rolled, "2026-08").archives).toHaveLength(1);
  });

  it("safely records skipped empty months", () => {
    const data = createDefaultData(new Date("2026-05-10T12:00:00"));
    const rolled = applyMonthlyRollover(data, "2026-08");
    expect(rolled.archives.map((item) => item.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });
});

describe("backup restoration", () => {
  it("round-trips all local data", () => {
    const data = createDefaultData(new Date("2026-08-10T12:00:00"));
    data.transactions = [purchase("one", 4250)];
    expect(parseBackup(JSON.stringify(createBackup(data)))).toEqual(data);
  });

  it("rejects malformed data without producing replacement state", () => {
    expect(() =>
      parseBackup('{"app":"monthly-money","backupVersion":1,"data":{}}'),
    ).toThrow("backup version");
    expect(() => parseBackup("not json")).toThrow("not valid JSON");
  });
});
