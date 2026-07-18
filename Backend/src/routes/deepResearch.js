const express = require("express");
const { deepResearch } = require("../services/deepResearcher");

const router = express.Router();

router.post("/deep-research/:protocolId", async (req, res, next) => {
  try {
    const { protocolId } = req.params;
    const result = await deepResearch(protocolId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
