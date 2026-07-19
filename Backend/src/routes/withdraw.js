const { Router } = require("express");
const { getById, update } = require("../services/db");
const { callVerify } = require("../services/contract");

const router = Router();

router.post("/withdraw", async (req, res, next) => {
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
      return res.status(400).json({ error: true, message: `Cannot withdraw — commitment is already ${commitment.status}` });
    }

    if (commitment.missed_count >= 2) {
      return res.status(400).json({
        error: true,
        message: "Cannot withdraw — you have already missed 2 or more checks. Only withdrawals with 0 or 1 missed checks are allowed.",
      });
    }

    const now = new Date();
    const network = commitment.network || "testnet";
    const tx = await callVerify(commitment.onchain_commitment_id, commitment.protocol_contract_address, network);

    const result = await update("commitments", commitment.id, {
      status: "withdrawn",
      verify_tx_hash: tx.txHash,
      verified_at: now.toISOString(),
      last_check_at: now.toISOString(),
    });

    console.log("[WITHDRAW] Commitment", commitment.id, "withdrawn by user");
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
