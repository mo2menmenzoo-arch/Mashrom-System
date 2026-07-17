/**
 * Firebase Realtime Database sync for cross-device data sharing.
 * Uses the Firebase REST API — no SDK dependency required.
 *
 * SETUP: Set FIREBASE_DB_URL to your Firebase RTDB URL
 * (e.g. https://your-project-default-rtdb.firebaseio.com).
 *
 * ponytail: REST API over fetch, no offline persistence. Add Firebase SDK
 * if offline-first with conflict resolution is needed.
 */

const FIREBASE_DB_URL = import.meta.env.VITE_FIREBASE_DB_URL || '';

const TABLES = [
  'users', 'partners', 'greenhouses', 'cycles', 'inventory',
  'petty_cash', 'transactions', 'expenses', 'operational_logs',
  'employees', 'assets', 'production'
] as const;

type TableName = typeof TABLES[number];

/** Push the full contents of a local table to Firebase. */
export async function pushTable(tableName: TableName, data: any[]): Promise<void> {
  if (!FIREBASE_DB_URL) return;
  try {
    // Convert array to keyed object for Firebase RTDB
    const keyed: Record<string, any> = {};
    for (const item of data) {
      keyed[String(item.id)] = item;
    }
    await fetch(`${FIREBASE_DB_URL}/${tableName}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keyed),
    });
  } catch (e) {
    console.warn(`[sync] push "${tableName}" failed:`, e);
  }
}

/** Pull all data for a table from Firebase into a local array. */
export async function pullTable(tableName: TableName): Promise<any[]> {
  if (!FIREBASE_DB_URL) return [];
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/${tableName}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data) return [];
    return Object.values(data) as any[];
  } catch (e) {
    console.warn(`[sync] pull "${tableName}" failed:`, e);
    return [];
  }
}

/** Push every table to the cloud. Call after any bulk write. */
export async function pushAll(getter: (t: TableName) => Promise<any[]>): Promise<void> {
  for (const t of TABLES) {
    const data = await getter(t);
    await pushTable(t, data);
  }
}

/** Returns true if Firebase DB URL is configured and sync is available. */
export function isSyncConfigured(): boolean {
  return FIREBASE_DB_URL.length > 0;
}

/** Pull every table from the cloud. Returns a map of tableName → rows. */
export async function pullAll(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  for (const t of TABLES) {
    result[t] = await pullTable(t);
  }
  return result;
}
