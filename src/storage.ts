import { applyMonthlyRollover, migrateData } from "./domain";
import { createDefaultData } from "./defaults";
import type { AppData } from "./types";

const DB_NAME = "monthly-money-db";
const STORE_NAME = "app-state";
const KEY = "primary";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local storage."));
  });

export const saveData = async (data: AppData): Promise<void> => {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(data, KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save data."));
  });
  db.close();
};

export const loadData = async (): Promise<AppData> => {
  const db = await openDatabase();
  const stored = await new Promise<unknown>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read local storage."));
  });
  db.close();
  const data = stored ? migrateData(stored) : createDefaultData();
  const rolled = applyMonthlyRollover(data);
  await saveData(rolled);
  return rolled;
};

export const clearData = async (): Promise<AppData> => {
  const fresh = createDefaultData();
  await saveData(fresh);
  return fresh;
};
