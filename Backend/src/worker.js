require("dotenv").config();
const { runWorkerTick } = require("./services/worker");

async function main() {
  console.log("[WORKER] KYP Verification Worker (standalone mode) started");
  const intervalMs = parseInt(process.env.WORKER_INTERVAL_MS, 10) || 60 * 60 * 1000;
  console.log(`[WORKER] Polling every ${intervalMs / 60000} minutes`);

  await runWorkerTick();
  setInterval(() => runWorkerTick().catch((err) => console.error("[WORKER] Tick error:", err.message)), intervalMs);
}

main().catch((err) => {
  console.error("[WORKER] Fatal error:", err);
  process.exit(1);
});
