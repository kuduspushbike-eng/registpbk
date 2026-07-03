import { MemberData, UserStatus } from "../types";

export interface FirebaseSyncConfig {
  projectId: string;
  collectionName: string;
  apiKey: string;
  syncMode: "ADD_UPDATE_ONLY" | "FULL_SYNC_DELETE" | "FULL_SYNC_DEACTIVATE";
}

const STORAGE_KEYS = {
  PROJECT_ID: "firebase_sync_project_id",
  COLLECTION_NAME: "firebase_sync_collection_name",
  API_KEY: "firebase_sync_api_key",
  SYNC_MODE: "firebase_sync_mode",
};

export const getFirebaseConfig = (): FirebaseSyncConfig => {
  return {
    projectId: localStorage.getItem(STORAGE_KEYS.PROJECT_ID) || "",
    collectionName: localStorage.getItem(STORAGE_KEYS.COLLECTION_NAME) || "members",
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
    syncMode: (localStorage.getItem(STORAGE_KEYS.SYNC_MODE) as any) || "ADD_UPDATE_ONLY",
  };
};

export const saveFirebaseConfig = (config: Partial<FirebaseSyncConfig>) => {
  if (config.projectId !== undefined) localStorage.setItem(STORAGE_KEYS.PROJECT_ID, config.projectId.trim());
  if (config.collectionName !== undefined) localStorage.setItem(STORAGE_KEYS.COLLECTION_NAME, config.collectionName.trim());
  if (config.apiKey !== undefined) localStorage.setItem(STORAGE_KEYS.API_KEY, config.apiKey.trim());
  if (config.syncMode !== undefined) localStorage.setItem(STORAGE_KEYS.SYNC_MODE, config.syncMode);
};

// Helper to convert plain object to Firestore document field structure
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (typeof val === "number") {
      fields[key] = Number.isInteger(val)
        ? { integerValue: String(val) }
        : { doubleValue: val };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (val instanceof Date) {
      fields[key] = { timestampValue: val.toISOString() };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((v) => {
            if (typeof v === "string") return { stringValue: v };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof val === "object") {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

// Helper to parse Firestore document fields back to standard JS object
function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  if (!fields) return obj;

  for (const [key, valueObj] of Object.entries(fields)) {
    const valueType = Object.keys(valueObj || {})[0];
    const val = (valueObj as any)[valueType];

    if (valueType === "stringValue") {
      obj[key] = val;
    } else if (valueType === "integerValue") {
      obj[key] = parseInt(val, 10);
    } else if (valueType === "doubleValue") {
      obj[key] = parseFloat(val);
    } else if (valueType === "booleanValue") {
      obj[key] = val;
    } else if (valueType === "timestampValue") {
      obj[key] = new Date(val);
    } else if (valueType === "mapValue") {
      obj[key] = fromFirestoreFields(val.fields || {});
    } else if (valueType === "arrayValue") {
      const values = val.values || [];
      obj[key] = values.map((vObj: any) => {
        const type = Object.keys(vObj)[0];
        return vObj[type];
      });
    }
  }
  return obj;
}

export interface SyncItem {
  id: string; // Deterministic ID, e.g. "08123456789_1" or "08123456789_2"
  name: string;
  nickname: string;
  whatsapp: string;
  birthYear: number;
  gender: string;
  shirtSize: string;
  status: "AKTIF" | "TIDAK_AKTIF";
  source: "sheet";
}

export interface FirestoreMember {
  id: string; // The document name
  fields: Record<string, any>;
  parsed: Record<string, any>;
}

// Fetch all documents from firestore collection
export const fetchFirestoreMembers = async (
  config: FirebaseSyncConfig
): Promise<FirestoreMember[]> => {
  if (!config.projectId) throw new Error("Firebase Project ID belum diisi.");

  const { projectId, collectionName, apiKey } = config;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;
  const url = apiKey ? `${baseUrl}?key=${apiKey}&pageSize=500` : `${baseUrl}?pageSize=500`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Collection might not exist yet, which is fine
      return [];
    }
    const errText = await response.text();
    console.error("Firestore error response:", errText);
    throw new Error(`Firestore API Error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  const documents = data.documents || [];

  return documents.map((doc: any) => {
    // Document path format is projects/project-id/databases/(default)/documents/collection/document-id
    const pathParts = doc.name.split("/");
    const id = pathParts[pathParts.length - 1];
    return {
      id,
      fields: doc.fields,
      parsed: fromFirestoreFields(doc.fields),
    };
  });
};

// Write a document to Firestore using PATCH (upsert)
export const upsertFirestoreDocument = async (
  config: FirebaseSyncConfig,
  docId: string,
  data: Record<string, any>
): Promise<void> => {
  const { projectId, collectionName, apiKey } = config;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const firestoreDoc = {
    fields: toFirestoreFields(data),
  };

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(firestoreDoc),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal menulis dokumen ${docId}: ${response.statusText}. Detail: ${errText}`);
  }
};

// Delete a document from Firestore
export const deleteFirestoreDocument = async (
  config: FirebaseSyncConfig,
  docId: string
): Promise<void> => {
  const { projectId, collectionName, apiKey } = config;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const response = await fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Gagal menghapus dokumen ${docId}: ${response.statusText}`);
  }
};

// Prepare comparison list
export interface SyncComparison {
  toAdd: SyncItem[];
  toUpdate: { local: SyncItem; remote: FirestoreMember }[];
  toRemove: FirestoreMember[]; // If full sync delete is on
  toDeactivate: FirestoreMember[]; // If full sync deactivate is on
  identicalCount: number;
}

export const compareSyncData = (
  sheetMembers: MemberData[],
  firestoreMembers: FirestoreMember[],
  config: FirebaseSyncConfig
): SyncComparison => {
  // Extract all eligible active members from Sheet (APPROVED or REGISTERED)
  const activeLocalItems: SyncItem[] = [];

  sheetMembers.forEach((m) => {
    const isEligible = m.status === UserStatus.APPROVED || m.status === UserStatus.REGISTERED;
    if (!isEligible) return;

    // Child 1
    if (m.nickname || m.fullName) {
      activeLocalItems.push({
        id: `${m.whatsapp}_1`,
        name: m.fullName || m.nickname || "",
        nickname: m.nickname || "",
        whatsapp: m.whatsapp,
        birthYear: m.birthYear || 0,
        gender: m.gender || "",
        shirtSize: m.shirtSize || "",
        status: "AKTIF",
        source: "sheet",
      });
    }

    // Child 2
    if (m.childCount === 2 && (m.nickname2 || m.fullName2)) {
      activeLocalItems.push({
        id: `${m.whatsapp}_2`,
        name: m.fullName2 || m.nickname2 || "",
        nickname: m.nickname2 || "",
        whatsapp: m.whatsapp,
        birthYear: m.birthYear2 || 0,
        gender: m.gender2 || "",
        shirtSize: m.shirtSize2 || "",
        status: "AKTIF",
        source: "sheet",
      });
    }
  });

  const toAdd: SyncItem[] = [];
  const toUpdate: { local: SyncItem; remote: FirestoreMember }[] = [];
  const toRemove: FirestoreMember[] = [];
  const toDeactivate: FirestoreMember[] = [];
  let identicalCount = 0;

  // Track which remote IDs we processed
  const matchedRemoteIds = new Set<string>();

  activeLocalItems.forEach((local) => {
    const remote = firestoreMembers.find((r) => r.id === local.id);
    if (!remote) {
      toAdd.push(local);
    } else {
      matchedRemoteIds.add(remote.id);

      // Compare fields to check if they need update
      // Normalizing data fields for comparison (ignoring case/whitespace)
      const isDifferent =
        (remote.parsed.name || "").trim().toLowerCase() !== local.name.trim().toLowerCase() ||
        (remote.parsed.nickname || "").trim().toLowerCase() !== local.nickname.trim().toLowerCase() ||
        (remote.parsed.whatsapp || "").trim() !== local.whatsapp.trim() ||
        Number(remote.parsed.birthYear || 0) !== Number(local.birthYear) ||
        (remote.parsed.gender || "").trim() !== local.gender.trim() ||
        (remote.parsed.shirtSize || "").trim() !== local.shirtSize.trim() ||
        (remote.parsed.status || "AKTIF") !== "AKTIF";

      if (isDifferent) {
        toUpdate.push({ local, remote });
      } else {
        identicalCount++;
      }
    }
  });

  // Handle items in Firebase but NOT in current Active Spreadsheet registrations
  firestoreMembers.forEach((remote) => {
    if (!matchedRemoteIds.has(remote.id)) {
      // In Firestore but not active sheet
      if (config.syncMode === "FULL_SYNC_DELETE") {
        toRemove.push(remote);
      } else if (config.syncMode === "FULL_SYNC_DEACTIVATE") {
        // Only deactivate if its status is currently AKTIF
        if (remote.parsed.status !== "TIDAK_AKTIF") {
          toDeactivate.push(remote);
        } else {
          identicalCount++; // Already inactive, so identical/no action needed
        }
      }
    }
  });

  return {
    toAdd,
    toUpdate,
    toRemove,
    toDeactivate,
    identicalCount,
  };
};
