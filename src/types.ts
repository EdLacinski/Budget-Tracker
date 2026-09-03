export type EntryKind = "bill" | "subscription";

export interface BudgetEntry {
  id: string;
  name: string;
  amountCents: number;
  enabled: boolean;
  kind: EntryKind;
  provisional?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  amountCents: number;
  categoryId: string;
  date: string;
  merchant: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthArchive {
  month: string;
  takeHomeCents: number;
  entries: BudgetEntry[];
  categories: Category[];
  transactions: Transaction[];
  archivedAt: string;
}

export interface AppData {
  schemaVersion: number;
  activeMonth: string;
  takeHomeCents: number;
  entries: BudgetEntry[];
  categories: Category[];
  transactions: Transaction[];
  archives: MonthArchive[];
}

export interface BackupEnvelope {
  app: "monthly-money";
  backupVersion: 1;
  exportedAt: string;
  data: AppData;
}
