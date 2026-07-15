const { Router } = require("express");

const router = Router();

router.post("/research", (req, res) => {
  const { input_raw } = req.body;

  if (!input_raw) {
    return res.status(400).json({ error: true, message: "input_raw is required" });
  }

  const example = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    input_raw,
    name: "Example Protocol",
    chain: "monad",
    network: "testnet",
    links: {
      project: "https://example-protocol.xyz",
      twitter: "https://x.com/example_protocol",
      discord: null,
      github: "https://github.com/example/protocol",
    },
    contract_address: "0x0000000000000000000000000000000000000000",
    score: 35,
    score_max: 50,
    who_its_for: "DeFi users looking for efficient lending on Monad.",
    use_cases: ["Lending", "Borrowing", "Yield farming"],
    risks: {
      contract: "Not audited by a top-tier firm",
      community: "Small but growing community",
      structural: "Relies on novel liquidation mechanism",
    },
    summary:
      "Example Protocol is a lending marketplace on Monad testnet. It offers competitive rates and a unique liquidation design.",
    created_at: new Date().toISOString(),
    created_by_wallet: "0x0000000000000000000000000000000000000000",
  };

  res.json(example);
});

module.exports = router;
