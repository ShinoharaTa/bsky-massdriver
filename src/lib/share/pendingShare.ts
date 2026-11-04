// Temporary store for shared content (text and images) handed over to the compose screen.
// Used from both the Service Worker and the page, so it must not depend on the DOM.

const DB_NAME = "massdriver-share";
const STORE_NAME = "pending";
const RECORD_KEY = "current";

export type PendingShare = {
  text: string;
  files: File[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = run(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function composeShareText(title: string, sharedText: string, sharedUrl: string): string {
  const parts: string[] = [];

  if (title) parts.push(title);

  if (sharedText) {
    const alreadyHasTitle = title && sharedText.startsWith(title);
    if (!alreadyHasTitle) parts.push(sharedText);
  }

  if (sharedUrl) {
    const alreadyInText = sharedText.includes(sharedUrl);
    if (!alreadyInText) parts.push(sharedUrl);
  }

  return parts.join("\n").trim();
}

export async function savePendingShare(share: PendingShare): Promise<void> {
  const record: PendingShare = { text: share.text, files: share.files };
  await withStore("readwrite", (store) => store.put(record, RECORD_KEY));
}

export async function loadPendingShare(): Promise<PendingShare | null> {
  const record = await withStore<PendingShare | undefined>("readonly", (store) =>
    store.get(RECORD_KEY)
  );
  if (!record) return null;
  return { text: record.text ?? "", files: record.files ?? [] };
}

export async function clearPendingShare(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(RECORD_KEY));
}
