const { query, update, insert } = require("./db");
const { checkEngagement, callVerify, callSlash } = require("./contract");

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
    return { type: "verified", commitmentId: commitment.id, txHash: tx.txHash };
  }

  const newMissedCount = commitment.missed_count + 1;
  await update("commitments", commitment.id, {
    missed_count: newMissedCount,
    last_check_at: now.toISOString(),
  });
  console.log(`[WORKER] Commitment ${commitment.id} -> missed_count: ${newMissedCount}/3`);
  return { type: "missed", commitmentId: commitment.id, missedCount: newMissedCount };
}

async function runSlash(commitment) {
  console.log(`[WORKER] Slashing commitment ${commitment.id} (past deadline)`);
  const tx = await callSlash(commitment.onchain_commitment_id);
  await update("commitments", commitment.id, {
    status: "slashed",
    verify_tx_hash: tx.txHash,
    last_check_at: new Date().toISOString(),
  });
  console.log(`[WORKER] Commitment ${commitment.id} -> SLASHED (tx: ${tx.txHash})`);
  return { type: "slashed", commitmentId: commitment.id, txHash: tx.txHash };
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

  await update("commitments", commitment.id, { last_snapshot_at: now });

  console.log(`[SNAPSHOT] Commitment ${commitment.id} -> ${eventType}`);
  return { type: "snapshot", commitmentId: commitment.id, eventType };
}

async function runWorkerTick() {
  const results = { payouts: [], snapshots: [], errors: [] };

  const allCommitments = await query("commitments", (c) => c.status === "active");
  console.log(`[WORKER] Tick: ${allCommitments.length} active commitments`);
  const now = Date.now();

  for (const commitment of allCommitments) {
    try {
      const deadline = new Date(commitment.verify_deadline).getTime();

      if (now >= deadline) {
        const r = await runSlash(commitment);
        results.payouts.push(r);
        continue;
      }

      const lastCheck = commitment.last_check_at
        ? new Date(commitment.last_check_at).getTime()
        : new Date(commitment.commit_timestamp).getTime();

      if (now - lastCheck >= CHECK_INTERVAL_MS) {
        const r = await runCheck(commitment);
        results.payouts.push(r);
      }

      const lastSnapshot = commitment.last_snapshot_at
        ? new Date(commitment.last_snapshot_at).getTime()
        : 0;

      if (now - lastSnapshot >= SNAPSHOT_INTERVAL_MS) {
        const r = await runSnapshot(commitment);
        results.snapshots.push(r);
      }
    } catch (err) {
      console.error(`[WORKER] Error on ${commitment.id}:`, err.message);
      results.errors.push({ commitmentId: commitment.id, error: err.message });
    }
  }

  return results;
}

module.exports = { runWorkerTick, runCheck, runSlash, runSnapshot };
