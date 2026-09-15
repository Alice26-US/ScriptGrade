const DB_NAME = "scriptgrade";
const STORE = "drafts";

export type DraftPage = { slot: number; blob: Blob; mime: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(exerciseId: string, pages: DraftPage[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(pages, exerciseId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDraft(exerciseId: string): Promise<DraftPage[]> {
  const db = await openDb();
  const pages = await new Promise<DraftPage[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(exerciseId);
    req.onsuccess = () => resolve((req.result as DraftPage[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return pages;
}
