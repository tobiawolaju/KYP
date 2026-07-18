const { Router } = require("express");
const { getAll, getById, normalizeProtocol } = require("../services/db");

const router = Router();

router.get("/protocols", async (req, res) => {
  let protocols = await getAll("protocols");

  const { network, category, minScore } = req.query;

  if (network) {
    protocols = protocols.filter((p) => p.network === network);
  }
  if (category) {
    protocols = protocols.filter((p) => p.category === category);
  }
  if (minScore) {
    const min = parseInt(minScore, 10);
    if (!isNaN(min)) {
      protocols = protocols.filter((p) => p.score >= min);
    }
  }

  res.json(protocols.map(normalizeProtocol));
});

router.get("/protocols/:id", async (req, res) => {
  const protocol = await getById("protocols", req.params.id);
  if (!protocol) {
    return res.status(404).json({ error: true, message: "Protocol not found" });
  }
  res.json(normalizeProtocol(protocol));
});

module.exports = router;
