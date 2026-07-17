const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!serviceAccountPath) {
  console.error("[FIREBASE] FIREBASE_SERVICE_ACCOUNT_PATH is not set");
  process.exit(1);
}

if (!databaseURL) {
  console.error("[FIREBASE] FIREBASE_DATABASE_URL is not set");
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const db = admin.database();

console.log("[FIREBASE] Admin SDK initialized, connected to:", databaseURL);

module.exports = { admin, db };
