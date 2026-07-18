/**
 * Cloud sync via the Vercel serverless API (api/store.js), which persists to a
 * shared JSON file in the GitHub repo. Replaces the dead Firebase project so
 * data created on one phone appears on every other phone.
 *
 * Data flow:
 *   Write: app -> POST /api/store -> GitHub JSON (shared)
 *   Read:  poll GET /api/store -> Dexie cache -> React state
 */

const TABLES = [
  'users', 'partners', 'greenhouses', 'cycles', 'inventory',
  'petty_cash', 'transactions', 'expenses', 'operational_logs',
  'employees', 'assets', 'production',
] as const;

type CollectionName = typeof TABLES[number];

function apiBase(): string {
  // Works on the deployed Vercel URL and on localhost dev (proxied).
  return '/api/store';
}

async function postPayload(payload: any): Promise<void> {
  const res = await fetch(apiBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('cloud sync POST failed: ' + res.status + ' ' + txt);
  }
}

/** Write a single document (creates or overwrites). */
export async function writeDoc(collectionName: CollectionName, id: string | number, data: Record<string, any>): Promise<void> {
  await postPayload({ table: collectionName, id, data });
}

/** Delete a single document. */
export async function deleteDocById(collectionName: CollectionName, id: string | number): Promise<void> {
  await postPayload({ table: collectionName, id, delete: true });
}

/** Bulk write: replace an entire table. */
export async function bulkWriteCollection(collectionName: CollectionName, items: any[]): Promise<void> {
  await postPayload({ table: collectionName, rows: items });
}

/** Check if the shared collection is empty. */
export async function isCollectionEmpty(collectionName: CollectionName): Promise<boolean> {
  try {
    const res = await fetch(apiBase(), { method: 'GET' });
    if (!res.ok) return true;
    const data = await res.json();
    const table = data[collectionName];
    return !table || Object.keys(table).length === 0;
  } catch {
    return true;
  }
}

export type SnapshotCallback = (collectionName: CollectionName, docs: Record<string, any>) => void;

/** Poll-based "real-time" subscription. Returns unsubscribe. */
export function subscribeToAll(callback: SnapshotCallback, intervalMs = 4000): () => void {
  let stopped = false;
  let timer: any = null;

  async function poll() {
    if (stopped) return;
    try {
      const res = await fetch(apiBase(), { method: 'GET' });
      if (!res.ok) return;
      const data = await res.json();
      for (const name of TABLES) {
        const raw = data[name] || {};
        const docs: Record<string, any> = {};
        // Strip deleted markers
        for (const [k, v] of Object.entries(raw)) {
          if (v && (v as any)._deleted) continue;
          docs[k] = v;
        }
        callback(name, docs);
      }
    } catch (e) {
      // Network blip — ignore, retry next tick
    } finally {
      if (!stopped) timer = setTimeout(poll, intervalMs);
    }
  }

  poll();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
