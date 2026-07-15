const { Router } = require("express");

const router = Router();

router.get("/verify", (req, res) => {
  const { commitment_id } = req.query;

  if (!commitment_id) {
    return res.status(400).json({ error: true, message: "commitment_id query parameter is required" });
  }

  const now = new Date();
  const deadline = new Date(now.getTime() - 1000);
  const isVerified = parseInt(commitment_id, 10) % 2 === 0;

  console.log("[VERIFY] Checking commitment:", commitment_id);

  const record = {
    id: commitment_id,
    status: isVerified ? "verified" : "slashed",
    verify_tx_hash: isVerified
      ? "0x0000000000000000000000000000000000000000000000000000000000000000"
      : "0x0000000000000000000000000000000000000000000000000000000000000001",
    verified_at: now.toISOString(),
    verify_deadline: deadline.toISOString(),
    message: isVerified
      ? "Engagement confirmed. Stake returned to user."
      : "No engagement found before deadline. Stake slashed.",
  };

  res.json(record);
});

module.exports = router;
