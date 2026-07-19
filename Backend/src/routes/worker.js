const { Router } = require("express");
const { runWorkerTick } = require("../services/worker");

const router = Router();

let workerRunning = false;
let lastRunAt = 0;
const MIN_INTERVAL_MS = Number(process.env.WORKER_MIN_INTERVAL_MS) || 5 * 60 * 1000;

router.post("/worker/tick", async (req, res) => {
  const now = Date.now();

  if (workerRunning) {
    return res.json({ status: "already_running" });
  }

  if (now - lastRunAt < MIN_INTERVAL_MS) {
    const nextRunIn = Math.ceil((MIN_INTERVAL_MS - (now - lastRunAt)) / 1000);
    return res.json({ status: "skipped", reason: "ran_recently", nextRunIn });
  }

  workerRunning = true;
  const startTime = Date.now();

  try {
    console.log("[WORKER-ROUTE] Tick started");
    const result = await runWorkerTick();
    const elapsed = Date.now() - startTime;
    lastRunAt = Date.now();
    console.log(`[WORKER-ROUTE] Tick completed in ${elapsed}ms`);
    res.json({ status: "completed", elapsed, result });
  } catch (err) {
    console.error("[WORKER-ROUTE] Tick failed:", err.message);
    res.status(500).json({ status: "error", error: err.message });
  } finally {
    workerRunning = false;
  }
});

module.exports = router;
