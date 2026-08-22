import type { RecordedPoint } from "../types/domain";

export type OfflineActivityStatus = "recording" | "paused" | "ready" | "syncing" | "failed";
export type OfflineActivity = {
  localId: string; startedAt: string; updatedAt: string; durationSeconds: number; status: OfflineActivityStatus;
  title?: string; description?: string; error?: string;
};

type StoredPoint = RecordedPoint & { id: string; localId: string };
const DB_NAME = "selva-plus-offline";
const DB_VERSION = 2;
const ACTIVITY_STORE = "activity-drafts";
const POINT_STORE = "activity-points-v2";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) db.createObjectStore(ACTIVITY_STORE, { keyPath: "localId" });
      if (!db.objectStoreNames.contains(POINT_STORE)) {
        const store = db.createObjectStore(POINT_STORE, { keyPath: "id" });
        store.createIndex("by-activity", "localId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function finishTransaction(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function createOfflineActivity(localId: string, startedAt: string) {
  const db = await openDb();
  const tx = db.transaction(ACTIVITY_STORE, "readwrite");
  tx.objectStore(ACTIVITY_STORE).put({ localId, startedAt, updatedAt: startedAt, durationSeconds: 0, status: "recording" } satisfies OfflineActivity);
  await finishTransaction(tx);
  db.close();
}

export async function updateOfflineActivity(localId: string, patch: Partial<Omit<OfflineActivity, "localId" | "startedAt">>) {
  const db = await openDb();
  const current = await new Promise<OfflineActivity | undefined>((resolve, reject) => {
    const request = db.transaction(ACTIVITY_STORE).objectStore(ACTIVITY_STORE).get(localId);
    request.onsuccess = () => resolve(request.result as OfflineActivity | undefined);
    request.onerror = () => reject(request.error);
  });
  if (!current) { db.close(); return; }
  const tx = db.transaction(ACTIVITY_STORE, "readwrite");
  tx.objectStore(ACTIVITY_STORE).put({ ...current, ...patch, updatedAt: new Date().toISOString() });
  await finishTransaction(tx);
  db.close();
}

export async function persistPoint(localId: string, point: RecordedPoint) {
  const db = await openDb();
  const tx = db.transaction(POINT_STORE, "readwrite");
  tx.objectStore(POINT_STORE).put({ ...point, localId, id: `${localId}:${point.recordedAt}` } satisfies StoredPoint);
  await finishTransaction(tx);
  db.close();
}

export async function getOfflineActivities(): Promise<OfflineActivity[]> {
  const db = await openDb();
  const activities = await new Promise<OfflineActivity[]>((resolve, reject) => {
    const request = db.transaction(ACTIVITY_STORE).objectStore(ACTIVITY_STORE).getAll();
    request.onsuccess = () => resolve(request.result as OfflineActivity[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return activities.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getOfflinePoints(localId: string): Promise<RecordedPoint[]> {
  const db = await openDb();
  const points = await new Promise<StoredPoint[]>((resolve, reject) => {
    const request = db.transaction(POINT_STORE).objectStore(POINT_STORE).index("by-activity").getAll(localId);
    request.onsuccess = () => resolve(request.result as StoredPoint[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return points.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    altitude: point.altitude,
    accuracy: point.accuracy,
    speed: point.speed,
    recordedAt: point.recordedAt,
  }));
}

export async function deleteOfflineActivity(localId: string) {
  const db = await openDb();
  const tx = db.transaction([ACTIVITY_STORE, POINT_STORE], "readwrite");
  tx.objectStore(ACTIVITY_STORE).delete(localId);
  const request = tx.objectStore(POINT_STORE).index("by-activity").openKeyCursor(IDBKeyRange.only(localId));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    tx.objectStore(POINT_STORE).delete(cursor.primaryKey);
    cursor.continue();
  };
  await finishTransaction(tx);
  db.close();
}
