// src/lib/attachmentStore.ts
// Native IndexedDB storage for Hayat AI file & media attachments (Images, Audio, Video, PDF, Docs)

const DB_NAME = 'HayatAI_AttachmentStore';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

let dbInstance: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'attachmentId' });
      }
    };
  });
};

export interface StoredAttachmentRecord {
  attachmentId: string;
  blob: Blob;
  mimeType: string;
  updatedAt: number;
}

export const saveAttachmentBlob = async (
  attachmentId: string,
  blobOrDataUrl: Blob | string,
  mimeType?: string
): Promise<boolean> => {
  try {
    const db = await getDB();
    let blob: Blob;

    if (typeof blobOrDataUrl === 'string') {
      if (blobOrDataUrl.startsWith('data:')) {
        const parts = blobOrDataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (mimeType || 'application/octet-stream');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const res = await fetch(blobOrDataUrl);
        blob = await res.blob();
      }
    } else {
      blob = blobOrDataUrl;
    }

    const record: StoredAttachmentRecord = {
      attachmentId,
      blob,
      mimeType: blob.type || mimeType || 'application/octet-stream',
      updatedAt: Date.now()
    };

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('IndexedDB put error:', req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Failed to save attachment to IndexedDB:', err);
    return false;
  }
};

export const getAttachmentBlob = async (attachmentId: string): Promise<Blob | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(attachmentId);

      req.onsuccess = () => {
        const record = req.result as StoredAttachmentRecord | undefined;
        if (record && record.blob) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to fetch attachment from IndexedDB:', err);
    return null;
  }
};

export const getAttachmentObjectUrl = async (attachmentId: string): Promise<string | null> => {
  const blob = await getAttachmentBlob(attachmentId);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return null;
};

export const deleteAttachmentBlob = async (attachmentId: string): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(attachmentId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to delete attachment from IndexedDB:', err);
    return false;
  }
};

export const cleanOrphanAttachments = async (activeAttachmentIds: string[]): Promise<number> => {
  try {
    const db = await getDB();
    const activeSet = new Set(activeAttachmentIds);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      let deletedCount = 0;

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const key = cursor.key as string;
          if (!activeSet.has(key)) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      req.onerror = () => resolve(0);
    });
  } catch (err) {
    console.warn('Failed to clean orphan attachments:', err);
    return 0;
  }
};
