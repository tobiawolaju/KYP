require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const path = require("path");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!serviceAccountPath || !databaseURL) {
  console.error("[MIGRATE] Set FIREBASE_SERVICE_ACCOUNT_PATH and FIREBASE_DATABASE_URL");
  process.exit(1);
}

const admin = require("firebase-admin");
const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const db = admin.database();

const LEGACY_ID_MAP = {
  p1: "aetherswap",
  p2: "monadlend",
  p3: "nexus-perps",
  p4: "leaf-gardens",
  p5: "basebridge",
  p6: "hive-dao",
  p7: "prism-money",
  p8: "orbit-zero",
};

async function migrate() {
  const protocolsSnap = await db.ref("protocols").once("value");
  const protocolIds = Object.keys(protocolsSnap.val() || {});

  let migrated = 0;
  let removed = 0;
  let skipped = 0;

  for (const node of ["favorites", "commitments"]) {
    const snap = await db.ref(node).once("value");
    const records = snap.val();
    if (!records) continue;

    for (const [key, record] of Object.entries(records)) {
      const pid = record.protocol_id;
      if (!pid || !pid.startsWith("p") || !/^\p\d+$/.test(pid)) {
        skipped++;
        continue;
      }

      const newId = LEGACY_ID_MAP[pid];
      if (newId && protocolIds.includes(newId)) {
        await db.ref(`${node}/${key}/protocol_id`).set(newId);
        console.log(`[MIGRATE] ${node}/${key}: ${pid} -> ${newId}`);
        migrated++;
      } else {
        await db.ref(`${node}/${key}`).remove();
        console.log(`[MIGRATE] ${node}/${key}: removed (old protocol ${pid} no longer exists)`);
        removed++;
      }
    }
  }

  console.log(`[MIGRATE] Done. Migrated: ${migrated}, Removed: ${removed}, Skipped: ${skipped}`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[MIGRATE] Fatal error:", err.message);
  process.exit(1);
});
