/**
 * Firestore CRUD + real-time onSnapshot listeners for all 12 collections.
 *
 * Data flow:
 *   Write: app → Firestore (primary) → onSnapshot → Dexie (cache) → React state
 *   Read:  Firestore onSnapshot → Dexie (cache) → React state
 */

import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, writeBatch, getDocs, type Unsubscribe,
} from 'firebase/firestore';
import { db as firestore, isFirebaseConfigured } from './firebase-config';

const COLLECTIONS = [
  'users', 'partners', 'greenhouses', 'cycles', 'inventory',
  'petty_cash', 'transactions', 'expenses', 'operational_logs',
  'employees', 'assets', 'production',
] as const;

type CollectionName = typeof COLLECTIONS[number];

export type SnapshotCallback = (collectionName: CollectionName, docs: Record<string, any>) => void;

// ==========================================
// Write operations
// ==========================================

/** Write a single document (creates or overwrites). */
export async function writeDoc(collectionName: CollectionName, id: string | number, data: Record<string, any>): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const docRef = doc(firestore, collectionName, String(id));
  await setDoc(docRef, { ...data, id: Number(id) || id });
}

/** Delete a single document. */
export async function deleteDocById(collectionName: CollectionName, id: string | number): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const docRef = doc(firestore, collectionName, String(id));
  await deleteDoc(docRef);
}

/** Bulk write: replace entire collection with new data (used on first sync / migration). */
export async function bulkWriteCollection(collectionName: CollectionName, items: any[]): Promise<void> {
  if (!isFirebaseConfigured()) return;
  // Write in batches of 500 (Firestore limit)
  for (let i = 0; i < items.length; i += 500) {
    const batch = writeBatch(firestore);
    for (const item of items.slice(i, i + 500)) {
      const id = String(item.id ?? doc(collection(firestore, collectionName)).id);
      const docRef = doc(firestore, collectionName, id);
      batch.set(docRef, { ...item, id: Number(id) || id });
    }
    await batch.commit();
  }
}

/** Check if a Firestore collection is empty (used for one-time migration). */
export async function isCollectionEmpty(collectionName: CollectionName): Promise<boolean> {
  if (!isFirebaseConfigured()) return true;
  const q = query(collection(firestore, collectionName));
  const snap = await getDocs(q);
  return snap.empty;
}

// ==========================================
// Real-time listeners
// ==========================================

/** Subscribe to a single collection. Returns unsubscribe function. */
export function subscribeToCollection(
  collectionName: CollectionName,
  callback: (docs: Record<string, any>) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) return () => {};
  const q = query(collection(firestore, collectionName));
  return onSnapshot(q, (snapshot) => {
    const docs: Record<string, any> = {};
    snapshot.forEach((d) => {
      docs[d.id] = { id: Number(d.id) || d.id, ...d.data() };
    });
    callback(docs);
  });
}

/** Subscribe to all 12 collections. Returns combined unsubscribe. */
export function subscribeToAll(callback: SnapshotCallback): Unsubscribe {
  if (!isFirebaseConfigured()) return () => {};
  const unsubs = COLLECTIONS.map((name) =>
    subscribeToCollection(name, (docs) => callback(name, docs))
  );
  return () => unsubs.forEach((u) => u());
}
