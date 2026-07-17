require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const path = require("path");

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
const protocols = require("../data/protocols.json");

async function seed() {
  console.log(`[SEED] Seeding ${protocols.length} protocols to Firebase RTDB...`);

  const ref = db.ref("protocols");

  for (const protocol of protocols) {
    await ref.child(protocol.id).set(protocol);
    console.log(`[SEED]   ✓ ${protocol.id}: ${protocol.name}`);
  }

  console.log("[SEED] Done. Protocols seeded:", protocols.length);

  const snapshot = await ref.once("value");
  const data = snapshot.val();
  const count = data ? Object.keys(data).length : 0;
  console.log("[SEED] Verification: /protocols node has", count, "entries");

  if (data) {
    const first = Object.values(data)[0];
    console.log("[SEED] Sample entry forensics type:", typeof first.forensics, "| isArray:", Array.isArray(first.forensics));
    console.log("[SEED] Sample entry team type:", typeof first.team, "| isArray:", Array.isArray(first.team));
    console.log("[SEED] Sample entry funding type:", typeof first.funding);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Fatal error:", err);
  process.exit(1);
});
