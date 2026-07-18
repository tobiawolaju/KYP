require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const path = require("path");
const https = require("https");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!serviceAccountPath || !databaseURL) {
  console.error("[SEED] Set FIREBASE_SERVICE_ACCOUNT_PATH and FIREBASE_DATABASE_URL in Backend/.env");
  process.exit(1);
}

const admin = require("firebase-admin");
const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const db = admin.database();
const TEMPLATE = require("../data/protocols.json")[0];

const CSV_URL = "https://raw.githubusercontent.com/monad-crypto/protocols/refs/heads/main/protocols-testnet.csv";

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function resetValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return "";
  if (typeof val === "number") return null;
  if (typeof val === "boolean") return null;
  if (Array.isArray(val)) return [];
  if (typeof val === "object") {
    const out = {};
    for (const key of Object.keys(val)) {
      out[key] = resetValue(val[key]);
    }
    return out;
  }
  return null;
}

function resetSchema(template) {
  const out = {};
  for (const key of Object.keys(template)) {
    out[key] = resetValue(template[key]);
  }
  return out;
}

function stripFirebaseStripped(obj) {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    const cleaned = obj.map(stripFirebaseStripped).filter((v) => v !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  const out = {};
  let hasKeys = false;
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const cleaned = stripFirebaseStripped(v);
      if (cleaned !== undefined && Object.keys(cleaned).length > 0) {
        out[k] = cleaned;
        hasKeys = true;
      }
    } else if (Array.isArray(v)) {
      const cleaned = v.map(stripFirebaseStripped).filter((x) => x !== undefined);
      if (cleaned.length > 0) {
        out[k] = cleaned;
        hasKeys = true;
      }
    } else {
      out[k] = v;
      hasKeys = true;
    }
  }
  return hasKeys ? out : undefined;
}

function downloadCsv() {
  return new Promise((resolve, reject) => {
    console.log("[SEED] Downloading Monad registry...");
    https
      .get(CSV_URL, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function parseCsv(raw) {
  const lines = raw.trim().split("\n");
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j].trim()] = (values[j] || "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function normalizeProtocols(rows) {
  console.log(`[SEED] CSV rows loaded: ${rows.length}`);

  const grouped = {};
  for (const row of rows) {
    const name = row.name;
    if (!grouped[name]) {
      grouped[name] = {
        name,
        category: row.ctype,
        subcategory: row.csubtype,
        allCategories: row.all_categories,
        contracts: [],
      };
    }
    grouped[name].contracts.push({
      name: row.contract,
      address: row.address,
      type: row.ctype,
    });
  }

  console.log(`[SEED] Protocols grouped: ${Object.keys(grouped).length}`);

  const protocols = Object.values(grouped).map((p) => {
    const protocol = resetSchema(TEMPLATE);
    protocol.id = slugify(p.name);
    protocol.name = p.name;
    protocol.chain = "monad";
    protocol.network = "testnet";
    protocol.category = p.category;
    protocol.subcategory = p.subcategory;
    protocol.allCategories = p.allCategories;
    protocol.contracts = p.contracts;
    return protocol;
  });

  console.log(`[SEED] Protocols normalized: ${protocols.length}`);
  return protocols;
}

async function deleteExistingProtocols() {
  const ref = db.ref("protocols");
  const snapshot = await ref.once("value");
  const data = snapshot.val();
  const count = data ? Object.keys(data).length : 0;
  console.log(`[SEED] Found ${count} existing protocols.`);

  if (count === 0) {
    console.log("[SEED] Nothing to delete.");
    return;
  }

  console.log("[SEED] Deleting...");
  await ref.remove();

  const verifySnapshot = await ref.once("value");
  const verifyData = verifySnapshot.val();
  if (verifyData !== null) {
    throw new Error(`Deletion failed: ${Object.keys(verifyData).length} protocols still exist.`);
  }
  console.log("[SEED] Deletion verified.");
}

async function uploadProtocols(protocols) {
  console.log(`[SEED] Protocols to upload: ${protocols.length}`);
  console.log("[SEED] Uploading...");
  const ref = db.ref("protocols");
  for (const protocol of protocols) {
    const clean = stripFirebaseStripped(protocol);
    await ref.child(protocol.id).set(clean);
  }
  console.log(`[SEED] Protocols uploaded: ${protocols.length}`);

  console.log("[SEED] Verifying upload...");
  const snapshot = await ref.once("value");
  const data = snapshot.val();
  const count = data ? Object.keys(data).length : 0;
  if (count !== protocols.length) {
    throw new Error(`Upload verification failed: expected ${protocols.length}, found ${count}`);
  }
  console.log(`[SEED] Upload verified: ${count} protocols in database.`);
}

async function main() {
  try {
    const raw = await downloadCsv();
    const rows = parseCsv(raw);
    const protocols = normalizeProtocols(rows);
    await deleteExistingProtocols();
    await uploadProtocols(protocols);
    console.log("[SEED] Done.");
    process.exit(0);
  } catch (err) {
    console.error("[SEED] Fatal error:", err.message);
    process.exit(1);
  }
}

main();
