const express = require("express");
const { deepResearch } = require("../services/deepResearcher");

const router = express.Router();

async function handleDeepResearch(req, res) {
  const { protocolId } = req.params;
  console.log(`[DEEP-ROUTE] ${req.method} /deep-research/${protocolId}`);

  if (!protocolId) {
    return res.status(400).json({ error: true, message: "protocolId is required" });
  }

  try {
    const result = await deepResearch(protocolId);
    console.log(`[DEEP-ROUTE] Result for "${protocolId}":`, result.status);
    res.json(result);
  } catch (err) {
    console.error(`[DEEP-ROUTE] Error for "${protocolId}":`, err.message);
    next(err);
  }
}

router.get("/deep-research/:protocolId", handleDeepResearch);
router.post("/deep-research/:protocolId", handleDeepResearch);

module.exports = router;
