const express = require("express");
const { flashResearch } = require("../services/flashResearcher");

const router = express.Router();

router.post("/flash-research", async (req, res, next) => {
  try {
    const { query } = req.body;
    console.log(`[FLASH-ROUTE] POST /flash-research — query: "${query}"`);
    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "query is required" });
    }
    const result = await flashResearch(query.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
