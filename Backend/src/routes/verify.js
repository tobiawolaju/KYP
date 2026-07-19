const { Router } = require("express");
const { getById, update } = require("../services/db");
const { checkEngagement, callVerify, callSlash } = require("../services/contract");

const router = Router();

const CHECK_INTERVAL_MS = 72 * 60 * 60 * 1000;
const MAX_MISSED_CHECKS = 3;

router.get("/verify", async (req, res, next) => {
  try {
    const { commitment_id } = req.query;

    if (!commitment_id) {
      return res.status(400).json({ error: true, message: "commitment_id query parameter is required" });
    }

    const commitment = await getById("commitments", commitment_id);
    if (!commitment) {
      return res.status(404).json({ error: true, message: "Commitment not found" });
    }

    if (commitment.status !== "active") {
      return res.status(400).json({ error: true, message: `Commitment already ${commitment.status}` });
    }

    const now = new Date();
    const deadline = new Date(commitment.verify_deadline);

    if (now <= deadline) {
      return res.status(400).json({ error: true, message: "Deadline not passed yet — use POST /verify/check for interim checks" });
    }

    const network = commitment.network || "testnet";
    const hasEngagement = await checkEngagement(
      commitment.user_wallet,
      commitment.protocol_contract_address,
      commitment.commit_timestamp,
      network
    );

    let result;
    if (hasEngagement) {
      const tx = await callVerify(commitment.onchain_commitment_id, network);
      result = await update("commitments", commitment.id, {
        status: "verified",
        verify_tx_hash: tx.txHash,
        verified_at: now.toISOString(),
        last_check_at: now.toISOString(),
      });
    } else {
      const tx = await callSlash(commitment.onchain_commitment_id, network);
      result = await update("commitments", commitment.id, {
        status: "slashed",
        verify_tx_hash: tx.txHash,
        missed_count: commitment.missed_count + 1,
        last_check_at: now.toISOString(),
      });
    }

    console.log("[VERIFY] Commitment", commitment.id, "->", result.status);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/verify/check", async (req, res, next) => {
  try {
    const { commitment_id } = req.body;

    if (!commitment_id) {
      return res.status(400).json({ error: true, message: "Missing required field: commitment_id" });
    }

    const commitment = await getById("commitments", commitment_id);
    if (!commitment) {
      return res.status(404).json({ error: true, message: "Commitment not found" });
    }

    if (commitment.status !== "active") {
      return res.status(400).json({ error: true, message: `Commitment already ${commitment.status}` });
    }

    const network = commitment.network || "testnet";
    const hasEngagement = await checkEngagement(
      commitment.user_wallet,
      commitment.protocol_contract_address,
      commitment.commit_timestamp,
      network
    );

    const now = new Date();

    if (hasEngagement) {
      const tx = await callVerify(commitment.onchain_commitment_id, network);
      const result = await update("commitments", commitment.id, {
        status: "verified",
        verify_tx_hash: tx.txHash,
        verified_at: now.toISOString(),
        last_check_at: now.toISOString(),
      });

      console.log("[VERIFY/CHECK] Engagement found for", commitment.id, "-> verified");
      return res.json(result);
    }

    const newMissedCount = commitment.missed_count + 1;

    if (newMissedCount >= MAX_MISSED_CHECKS) {
      const tx = await callSlash(commitment.onchain_commitment_id, network);
      const result = await update("commitments", commitment.id, {
        status: "slashed",
        verify_tx_hash: tx.txHash,
        missed_count: newMissedCount,
        last_check_at: now.toISOString(),
      });

      console.log("[VERIFY/CHECK] 3 strikes for", commitment.id, "-> slashed");
      return res.json(result);
    }

    const result = await update("commitments", commitment.id, {
      missed_count: newMissedCount,
      last_check_at: now.toISOString(),
    });

    console.log("[VERIFY/CHECK] No engagement for", commitment.id, "missed_count:", newMissedCount);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
