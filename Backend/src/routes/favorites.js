const { Router } = require("express");
const { query, insert } = require("../services/db");

const router = Router();

router.get("/favorites", (req, res) => {
  const { wallet } = req.query;
  if (!wallet) {
    return res.status(400).json({ error: true, message: "wallet query parameter is required" });
  }
  const records = query("favorites", (f) => f.user_wallet.toLowerCase() === wallet.toLowerCase());
  res.json(records);
});

router.post("/favorites", (req, res) => {
  const { wallet, protocol_id } = req.body;

  if (!wallet || !protocol_id) {
    return res.status(400).json({ error: true, message: "wallet and protocol_id are required" });
  }

  const existing = query(
    "favorites",
    (f) => f.user_wallet.toLowerCase() === wallet.toLowerCase() && f.protocol_id === protocol_id
  );

  if (existing.length > 0) {
    const { db } = require("../services/db");
    db.get("favorites")
      .remove((f) => f.user_wallet.toLowerCase() === wallet.toLowerCase() && f.protocol_id === protocol_id)
      .write();
    console.log("[FAVORITES] Removed favorite:", protocol_id, "for wallet:", wallet);
    return res.json({ favorited: false, protocol_id });
  }

  const record = {
    user_wallet: wallet,
    protocol_id,
    favorited_at: new Date().toISOString(),
    auto_favorited: false,
  };

  insert("favorites", record);
  console.log("[FAVORITES] Added favorite:", protocol_id, "for wallet:", wallet);
  res.json({ favorited: true, protocol_id });
});

module.exports = router;
