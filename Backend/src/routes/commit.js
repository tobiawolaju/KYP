const { Router } = require("express");
const { randomUUID } = require("crypto");
const { insert, getById, query } = require("../services/db");

const router = Router();

const VERIFY_WINDOW_MS = 216 * 60 * 60 * 1000;

router.get("/commitments", async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) {
    return res.status(400).json({ error: true, message: "wallet query parameter is required" });
  }
  const records = await query("commitments", (c) => c.user_wallet.toLowerCase() === wallet.toLowerCase());
  res.json(records);
});

router.get("/commitments/:id", async (req, res) => {
  const record = await getById("commitments", req.params.id);
  if (!record) {
    return res.status(404).json({ error: true, message: "Commitment not found" });
  }
  res.json(record);
});

router.post("/commit", async (req, res) => {
  const { user_wallet, protocol_id, protocol_contract_address, staked_amount, stake_tx_hash, onchain_commitment_id } = req.body;

  if (!user_wallet || !protocol_id || !protocol_contract_address || !staked_amount || !stake_tx_hash) {
    return res.status(400).json({
      error: true,
      message: "Missing required fields: user_wallet, protocol_id, protocol_contract_address, staked_amount, stake_tx_hash",
    });
  }

  const now = new Date();
  const deadline = req.body.verify_deadline
    ? new Date(req.body.verify_deadline)
    : new Date(now.getTime() + VERIFY_WINDOW_MS);

  const record = {
    id: randomUUID(),
    user_wallet,
    chain: "monad",
    network: "testnet",
    protocol_id,
    protocol_contract_address,
    staked_amount,
    stake_tx_hash,
    onchain_commitment_id: onchain_commitment_id != null ? Number(onchain_commitment_id) : null,
    commit_timestamp: now.toISOString(),
    verify_deadline: deadline.toISOString(),
    status: "active",
    verify_tx_hash: null,
    verified_at: null,
    missed_count: 0,
    last_check_at: null,
  };

  await insert("commitments", record);

  console.log("[COMMIT] Saved commitment:", record.id, "for wallet:", user_wallet);

  res.status(201).json(record);
});

module.exports = router;
