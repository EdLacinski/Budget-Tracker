import { SCHEMA_VERSION, createDefaultData, monthKey } from "./defaults";
import type {
  AppData,
  BackupEnvelope,
  MonthArchive,
  Transaction,
} from "./types";

export const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

export const fixedTotal = (data: AppData): number =>
  sum(
    data.entries
      .filter((entry) => entry.enabled && entry.kind === "bill")
      .map((entry) => entry.amountCents),
  );

export const subscriptionTotal = (data: AppData): number =>
  sum(
    data.entries
      .filter((entry) => entry.enabled && entry.kind === "subscription")
      .map((entry) => entry.amountCents),
  );

export const variableTotal = (transactions: Transaction[]): number =>
  sum(transactions.map((transaction) => transaction.amountCents));

export const startingSpendable = (data: AppData): number =>
  data.takeHomeCents - fixedTotal(data) - subscriptionTotal(data);

export const remainingBalance = (data: AppData): number =>
  startingSpendable(data) - variableTotal(data.transactions);

export const centsFromInput = (value: string): number | null => {
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
};

export const formatMoney = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

const nextMonth = (month: string): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber, 1));
};

export const applyMonthlyRollover = (
  data: AppData,
  targetMonth = monthKey(),
): AppData => {
  if (data.activeMonth >= targetMonth) return data;
  let current = structuredClone(data);
  while (current.activeMonth < targetMonth) {
    const archive: MonthArchive = {
      month: current.activeMonth,
      takeHomeCents: current.takeHomeCents,
      entries: structuredClone(current.entries),
      categories: structuredClone(current.categories),
      transactions: structuredClone(current.transactions),
      archivedAt: new Date().toISOString(),
    };
    if (!current.archives.some((item) => item.month === current.activeMonth)) {
      current.archives.push(archive);
    }
    current = {
      ...current,
      activeMonth: nextMonth(current.activeMonth),
      transactions: [],
    };
  }
  return current;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const migrateData = (unknownData: unknown): AppData => {
  if (!isObject(unknownData)) throw new Error("Stored data is not an object.");
  const version = unknownData.schemaVersion;
  if (version !== SCHEMA_VERSION)
    throw new Error(`Unsupported data schema version: ${String(version)}`);
  return validateAppData(unknownData);
};

const validEntry = (entry: unknown): boolean =>
  isObject(entry) &&
  typeof entry.id === "string" &&
  typeof entry.name === "string" &&
  Number.isSafeInteger(entry.amountCents) &&
  (entry.amountCents as number) >= 0 &&
  typeof entry.enabled === "boolean" &&
  (entry.kind === "bill" || entry.kind === "subscription");

const validCategory = (category: unknown): boolean =>
  isObject(category) &&
  typeof category.id === "string" &&
  typeof category.name === "string" &&
  typeof category.color === "string";

const validTransaction = (transaction: unknown): boolean =>
  isObject(transaction) &&
  typeof transaction.id === "string" &&
  Number.isSafeInteger(transaction.amountCents) &&
  (transaction.amountCents as number) > 0 &&
  typeof transaction.categoryId === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(String(transaction.date)) &&
  typeof transaction.merchant === "string" &&
  typeof transaction.createdAt === "string" &&
  typeof transaction.updatedAt === "string";

export const validateAppData = (value: unknown): AppData => {
  if (!isObject(value)) throw new Error("Backup data is missing.");
  if (value.schemaVersion !== SCHEMA_VERSION)
    throw new Error("This backup version is not supported.");
  if (
    typeof value.activeMonth !== "string" ||
    !/^\d{4}-\d{2}$/.test(value.activeMonth)
  )
    throw new Error("Invalid active month.");
  if (
    !Number.isSafeInteger(value.takeHomeCents) ||
    (value.takeHomeCents as number) < 0
  )
    throw new Error("Invalid take-home pay.");
  if (!Array.isArray(value.entries) || !value.entries.every(validEntry))
    throw new Error("Invalid bills or subscriptions.");
  if (
    !Array.isArray(value.categories) ||
    !value.categories.every(validCategory)
  )
    throw new Error("Invalid categories.");
  if (
    !Array.isArray(value.transactions) ||
    !value.transactions.every(validTransaction)
  )
    throw new Error("Invalid transactions.");
  if (!Array.isArray(value.archives))
    throw new Error("Invalid archive history.");
  for (const archive of value.archives) {
    if (
      !isObject(archive) ||
      typeof archive.month !== "string" ||
      !Number.isSafeInteger(archive.takeHomeCents) ||
      !Array.isArray(archive.entries) ||
      !archive.entries.every(validEntry) ||
      !Array.isArray(archive.categories) ||
      !archive.categories.every(validCategory) ||
      !Array.isArray(archive.transactions) ||
      !archive.transactions.every(validTransaction) ||
      typeof archive.archivedAt !== "string"
    )
      throw new Error("Invalid archived month.");
  }
  return structuredClone(value) as unknown as AppData;
};

export const createBackup = (
  data: AppData,
  now = new Date(),
): BackupEnvelope => ({
  app: "monthly-money",
  backupVersion: 1,
  exportedAt: now.toISOString(),
  data: structuredClone(data),
});

export const parseBackup = (text: string): AppData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (
    !isObject(parsed) ||
    parsed.app !== "monthly-money" ||
    parsed.backupVersion !== 1
  ) {
    throw new Error("This is not a valid Monthly Money backup.");
  }
  return validateAppData(parsed.data);
};

export const daysRemaining = (now = new Date()): number => {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
};

export const newId = (): string => crypto.randomUUID();

export const freshData = (): AppData => createDefaultData();
