import type { AppData, BudgetEntry, Category } from "./types";

export const SCHEMA_VERSION = 1;

export const defaultEntries: BudgetEntry[] = [
  {
    id: "mortgage",
    name: "Mortgage",
    amountCents: 115942,
    enabled: true,
    kind: "bill",
  },
  { id: "hoa", name: "HOA", amountCents: 45000, enabled: true, kind: "bill" },
  {
    id: "car-lease",
    name: "Car lease",
    amountCents: 18800,
    enabled: true,
    kind: "bill",
  },
  {
    id: "electric",
    name: "Electric",
    amountCents: 6924,
    enabled: true,
    kind: "bill",
  },
  {
    id: "internet",
    name: "Internet",
    amountCents: 9999,
    enabled: true,
    kind: "bill",
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    amountCents: 847,
    enabled: true,
    kind: "subscription",
  },
  {
    id: "netflix",
    name: "Netflix",
    amountCents: 1642,
    enabled: true,
    kind: "subscription",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    amountCents: 500,
    enabled: true,
    kind: "subscription",
  },
  {
    id: "twitch",
    name: "Twitch subscriptions",
    amountCents: 3000,
    enabled: true,
    kind: "subscription",
  },
  {
    id: "disney",
    name: "Disney+",
    amountCents: 1695,
    enabled: true,
    kind: "subscription",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    amountCents: 2120,
    enabled: true,
    kind: "subscription",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    amountCents: 500,
    enabled: true,
    kind: "subscription",
    provisional: true,
  },
  {
    id: "discord-nitro",
    name: "Discord Nitro",
    amountCents: 999,
    enabled: true,
    kind: "subscription",
    provisional: true,
  },
];

export const defaultCategories: Category[] = [
  { id: "groceries", name: "Groceries", color: "#4f805f" },
  { id: "eating-out", name: "Eating Out", color: "#d48652" },
  { id: "gas", name: "Gas", color: "#5b7faf" },
  { id: "fun-money", name: "Fun Money", color: "#9a6cad" },
  { id: "miscellaneous", name: "Miscellaneous", color: "#7d8582" },
];

export const monthKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const createDefaultData = (now = new Date()): AppData => ({
  schemaVersion: SCHEMA_VERSION,
  activeMonth: monthKey(now),
  takeHomeCents: 295000,
  entries: structuredClone(defaultEntries),
  categories: structuredClone(defaultCategories),
  transactions: [],
  archives: [],
});
