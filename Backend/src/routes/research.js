const { Router } = require("express");
const { randomUUID } = require("crypto");
const { insert } = require("../services/db");

const router = Router();

/*
  Canonical Protocol Schema (reference)
  {
    "id": "string (UUID)",
    "name": "string",
    "image": "string (path or URL)",
    "chain": "string",
    "network": "string",
    "category": "string",
    "links": {
      "project": "string|null",
      "twitter": "string|null",
      "discord": "string|null",
      "github": "string|null"
    },
    "contract_verified": "boolean",
    "score": "number (0-50)",
    "score_max": 50,
    "who_its_for": "string",
    "who_its_not_for": "string",
    "use_cases": ["string"],
    "risks": {
      "contract": "string",
      "community": "string",
      "structural": "string"
    },
    "forensics": { "has_admin_functions": "boolean|null", "admin_function_notes": "string|null", "deployer_wallet_age": "string|null", "deployer_prior_deploys": "number|null", "top_10_holder_concentration_pct": "number|null" },
    "funding": { "has_funding_info": "boolean", "investors": ["string"], "source_note": "string" },
    "founder_history": { "prior_projects_found": "boolean|null", "details": "string", "confidence_note": "string" },
    "restricted_jurisdictions": ["string"],
    "team": [{ "name": "string", "role": "string" }],
    "team_as_of": "string (ISO date — when team info was last verified)",
    "deployed_date": "string (ISO date — first deployment)",
    "age_summary": "string (human-readable age)",
    "summary": "string (1-2 sentence overview)",
    "created_at": "string (ISO date — when this record was created)",
    "created_by_wallet": "string (wallet that requested research, or null)"
  }
*/

router.post("/research", async (req, res) => {
  const { input_raw, wallet_address } = req.body;

  if (!input_raw) {
    return res.status(400).json({ error: true, message: "input_raw is required" });
  }

  const example = {
    id: randomUUID(),
    name: input_raw,
    image: "/img.png",
    chain: "monad",
    network: "testnet",
    category: "DeFi",
    links: {
      project: "https://example-protocol.xyz",
      twitter: "https://x.com/example_protocol",
      discord: null,
      github: "https://github.com/example/protocol",
    },
    contract_verified: false,
    score: 35,
    score_max: 50,
    who_its_for: "DeFi users looking for efficient lending on Monad.",
    who_its_not_for: "Risk-averse users or those needing audited, battle-tested protocols.",
    use_cases: ["Lending", "Borrowing", "Yield farming"],
    risks: {
      contract: "Not audited by a top-tier firm.",
      community: "Small but growing community.",
      structural: "Relies on novel liquidation mechanism.",
    },
    forensics: {
      has_admin_functions: null,
      admin_function_notes: null,
      deployer_wallet_age: null,
      deployer_prior_deploys: null,
      top_10_holder_concentration_pct: null,
    },
    funding: {
      has_funding_info: false,
      investors: [],
      source_note: "Unknown — no public funding announcements. Treasury holds ~200k MON from initial liquidity.",
    },
    founder_history: {
      prior_projects_found: null,
      details: "Team is pseudonymous. No prior public projects found.",
      confidence_note: "Active in Monad Discord under the same handle since April 2026.",
    },
    restricted_jurisdictions: ["US", "CN"],
    team: [],
    team_as_of: "2026-07-17",
    deployed_date: "2026-06-15",
    age_summary: "Deployed ~32 days ago",
    summary:
      "Example Protocol is a lending marketplace on Monad testnet. It offers competitive rates and a unique liquidation design.",
    created_at: new Date().toISOString(),
    created_by_wallet: wallet_address || null,
  };

  await insert("research", example);

  console.log("[RESEARCH] Created research record:", example.id, "for input:", input_raw);

  res.json(example);
});

module.exports = router;
