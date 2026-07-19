require("dotenv").config();
const { query, update, insert } = require("./services/db");
const { checkEngagement, callVerify, callSlash } = require("./services/contract");

const CHECK_INTERVAL_MS = 72 * 60 * 60 * 1000;
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runCheck(commitment) {
  console.log(`[WORKER] Checking commitment ${commitment.id} (wallet: ${commitment.user_wallet})`);

  const hasEngagement = await checkEngagement(
    commitment.user_wallet,
    commitment.protocol_contract_address,
    commitment.commit_timestamp
  );

  const now = new Date();

  if (hasEngagement) {
    const tx = await callVerify(commitment.onchain_commitment_id);
    const result = await update("commitments", commitment.id, {
      status: "verified",
      verify_tx_hash: tx.txHash,
      verified_at: now.toISOString(),
      last_check_at: now.toISOString(),
      checks_passed: (commitment.checks_passed || 0) + 1,
    });
    console.log(`[WORKER] Commitment ${commitment.id} -> VERIFIED (tx: ${tx.txHash})`);
    return result;
  }

  const newMissedCount = commitment.missed_count + 1;

  const result = await update("commitments", commitment.id, {
    missed_count: newMissedCount,
    last_check_at: now.toISOString(),
  });
  console.log(`[WORKER] Commitment ${commitment.id} -> missed_count: ${newMissedCount}/3`);
  return result;
}

async function runSlash(commitment) {
  console.log(`[WORKER] Slashing commitment ${commitment.id} (past deadline, no verify called)`);
  const tx = await callSlash(commitment.onchain_commitment_id);
  const result = await update("commitments", commitment.id, {
    status: "slashed",
    verify_tx_hash: tx.txHash,
    last_check_at: new Date().toISOString(),
  });
  console.log(`[WORKER] Commitment ${commitment.id} -> SLASHED (tx: ${tx.txHash})`);
  return result;
}

async function runSnapshot(commitment) {
  console.log(`[SNAPSHOT] Checking daily activity for commitment ${commitment.id}`);

  const sinceTimestamp = commitment.last_snapshot_at || commitment.commit_timestamp;
  const hasEngagement = await checkEngagement(
    commitment.user_wallet,
    commitment.protocol_contract_address,
    sinceTimestamp
  );

  const eventType = hasEngagement ? "activity" : "no_activity";
  const now = new Date().toISOString();

  await insert("activity_events", {
    id: `${commitment.id}_${now.slice(0, 10)}`,
    commitment_id: commitment.id,
    user_wallet: commitment.user_wallet,
    protocol_contract_address: commitment.protocol_contract_address,
    event_type: eventType,
    timestamp: now,
  });

  await update("commitments", commitment.id, {
    last_snapshot_at: now,
  });

  console.log(`[SNAPSHOT] Commitment ${commitment.id} -> ${eventType}`);
}

async function tick() {
  console.log("[WORKER] Tick started at", new Date().toISOString());

  const allCommitments = await query("commitments", (c) => c.status === "active");
  console.log(`[WORKER] Found ${allCommitments.length} active commitments`);

  const now = Date.now();

  for (const commitment of allCommitments) {
    try {
      const deadline = new Date(commitment.verify_deadline).getTime();

      if (now >= deadline) {
        await runSlash(commitment);
        continue;
      }

      const lastCheck = commitment.last_check_at
        ? new Date(commitment.last_check_at).getTime()
        : new Date(commitment.commit_timestamp).getTime();

      const timeSinceLastCheck = now - lastCheck;
      if (timeSinceLastCheck < CHECK_INTERVAL_MS) {
        const hoursLeft = ((CHECK_INTERVAL_MS - timeSinceLastCheck) / (60 * 60 * 1000)).toFixed(1);
        console.log(`[WORKER] Commitment ${commitment.id} not due yet (${hoursLeft}h remaining)`);
        continue;
      }

      await runCheck(commitment);
    } catch (err) {
      console.error(`[WORKER] Error on commitment ${commitment.id}:`, err.message);
    }
  }

  console.log("[WORKER] Tick finished at", new Date().toISOString());
}

async function snapshotTick() {
  console.log("[SNAPSHOT] Snapshot tick started at", new Date().toISOString());

  const allCommitments = await query("commitments", (c) => c.status === "active");
  console.log(`[SNAPSHOT] Found ${allCommitments.length} active commitments`);

  const now = Date.now();

  for (const commitment of allCommitments) {
    try {
      const lastSnapshot = commitment.last_snapshot_at
        ? new Date(commitment.last_snapshot_at).getTime()
        : 0;

      if (now - lastSnapshot < SNAPSHOT_INTERVAL_MS) {
        console.log(`[SNAPSHOT] Commitment ${commitment.id} already snapshotted today`);
        continue;
      }

      await runSnapshot(commitment);
    } catch (err) {
      console.error(`[SNAPSHOT] Error on commitment ${commitment.id}:`, err.message);
    }
  }

  console.log("[SNAPSHOT] Snapshot tick finished at", new Date().toISOString());
}

async function main() {
  console.log("[WORKER] KYP Verification Worker started");
  console.log(`[WORKER] Check interval: ${CHECK_INTERVAL_MS / (60 * 60 * 1000)}h`);

  await tick();
  await snapshotTick();

  const intervalMs = parseInt(process.env.WORKER_INTERVAL_MS, 10) || 60 * 60 * 1000;
  console.log(`[WORKER] Polling every ${intervalMs / 60000} minutes`);

  setInterval(() => tick().catch((err) => console.error("[WORKER] Tick error:", err.message)), intervalMs);
  setInterval(() => snapshotTick().catch((err) => console.error("[SNAPSHOT] Tick error:", err.message)), intervalMs);
}

main().catch((err) => {
  console.error("[WORKER] Fatal error:", err);
  process.exit(1);
});
