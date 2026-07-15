const { Router } = require("express");

const router = Router();

router.post("/commit", (req, res) => {
  const { user_wallet, protocol_id, protocol_contract_address, staked_amount, stake_tx_hash } = req.body;

  if (!user_wallet || !protocol_id || !protocol_contract_address || !staked_amount || !stake_tx_hash) {
    return res.status(400).json({
      error: true,
      message: "Missing required fields: user_wallet, protocol_id, protocol_contract_address, staked_amount, stake_tx_hash",
    });
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  console.log("[COMMIT] Received payload:", req.body);

  const record = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    user_wallet,
    chain: "monad",
    network: "testnet",
    protocol_id,
    protocol_contract_address,
    staked_amount,
    stake_tx_hash,
    commit_timestamp: now.toISOString(),
    verify_deadline: deadline.toISOString(),
    status: "active",
    verify_tx_hash: null,
    verified_at: null,
  };

  res.status(201).json(record);
});

module.exports = router;
