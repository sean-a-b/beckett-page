const DB_NAME = "journalDB";
const DB_VERSION = 2;
const STORE_NAME = "entries";

let db = null;

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `entry_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const tx = event.target.transaction;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_date", "date", { unique: false });
        store.createIndex("by_kind", "kind", { unique: false });
        store.createIndex("by_timestamp", "timestamp", { unique: false });
        store.createIndex("by_date_kind", ["date", "kind"], { unique: false });
      }

      const migrateLegacyStore = (legacyStoreName, kind) => {
        if (!database.objectStoreNames.contains(legacyStoreName)) {
          return;
        }

        const legacyStore = tx.objectStore(legacyStoreName);
        const requestAll = legacyStore.getAll();

        requestAll.onsuccess = () => {
          const legacyEntries = requestAll.result || [];
          const entriesStore = tx.objectStore(STORE_NAME);

          for (const item of legacyEntries) {
            const timestamp = Number.isFinite(item.timestamp) ? item.timestamp : Date.now();
            const date =
              typeof item.date === "string"
                ? item.date
                : new Date(timestamp).toISOString().slice(0, 10);

            entriesStore.put({
              id: item.id || createId(),
              text: String(item.text || ""),
              rating: Number(item.rating || 0),
              date,
              timestamp,
              kind: item.kind || kind
            });
          }
        };
      };

      migrateLegacyStore("positives", "positive");
      migrateLegacyStore("archive", "archive");
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB."));
    };
  });
}

function addEntry(entry) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database has not been initialised."));
      return;
    }

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);

    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error || new Error("Failed to save entry."));
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted."));
  });
}

function getAllEntries() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database has not been initialised."));
      return;
    }

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to read entries."));
    };
  });
}