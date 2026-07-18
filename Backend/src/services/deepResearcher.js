require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { getById, update, normalizeProtocol } = require("./db");
const { isMeaningful, deepMerge, findChanges } = require("./merge");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const DEEP_RESEARCH_VERSION = "1.0";

const DEEP_PROMPT = `
You are a protocol security analyst. Given a protocol name and its current research data, perform deep analysis and return a structured JSON object.

Current protocol data:
{protocolData}

Return a TRUE JSON object with exactly this structure:

{
  "plain_summary": "1-3 sentence human-readable description of what this protocol does, who it serves, and why it matters",
  "summary": "concise protocol overview (1-2 sentences)",
  "risks": {
    "contract": "contract-level risk analysis (audit status, upgradeability, admin functions)",
    "community": "community risk analysis (size, activity, legitimacy)",
    "structural": "structural risk analysis (economic model, dependencies, centralization)"
  },
  "funding": {
    "has_funding_info": true_or_false,
    "investors": ["investor names if known"],
    "source_note": "how you found this funding info or why it's unknown"
  },
  "founder_history": {
    "prior_projects_found": true_or_false_or_null,
    "details": "who built this, what did they build before",
    "confidence_note": "how confident are you in this founder info"
  },
  "use_cases": ["primary use case 1", "primary use case 2"],
  "who_its_for": "one sentence describing the ideal user",
  "who_its_not_for": "one sentence describing who should avoid this",
  "team": [{"name": "known name or anon", "role": "role"}],
  "restricted_jurisdictions": ["country codes if known"],
  "contract_verified": true_or_false_or_null,
  "deployed_date": "YYYY-MM-DD or empty string",
  "evidence": {
    "audit_sources": ["names of auditors if known"],
    "team_verified": true_or_false,
    "community_size": "large|medium|small|unknown",
    "holder_concentration_pct": null_or_number,
    "admin_function_risk": "high|medium|low|unknown",
    "liquidity_depth": "deep|moderate|shallow|unknown"
  }
}

Rules:
- Return ONLY valid JSON. No markdown. No explanation. No code block.
- If you cannot determine something, use null, empty string, or empty array. Do NOT guess.
- Do NOT fabricate audit information. If no audit is known, say so.
- Do NOT fabricate team member names. If anonymous, use "anon".
- plain_summary should be accessible to a non-technical reader.
- risks should be specific and actionable, not vague warnings.
- evidence is for the scoring engine. Be as precise as possible.
- If information cannot be verified, set it to null or empty.
`;

function computeScore(evidence, protocol) {
  let score = 0;
  const breakdown = {};

  if (protocol.contract_verified === true) {
    score += 8;
    breakdown.contract_verified = 8;
  }

  if (evidence.admin_function_risk === "low") {
    score += 6;
    breakdown.admin_risk = 6;
  } else if (evidence.admin_function_risk === "medium") {
    score += 3;
    breakdown.admin_risk = 3;
  }

  if (evidence.team_verified === true) {
    score += 8;
    breakdown.team_verified = 8;
  }

  const funding = evidence.funding_known;
  if (funding === true) {
    score += 6;
    breakdown.funding = 6;
  }

  if (evidence.audit_sources && evidence.audit_sources.length > 0) {
    score += 10;
    breakdown.audit = 10;
  }

  if (evidence.community_size === "large") {
    score += 6;
    breakdown.community = 6;
  } else if (evidence.community_size === "medium") {
    score += 3;
    breakdown.community = 3;
  }

  if (evidence.liquidity_depth === "deep") {
    score += 4;
    breakdown.liquidity = 4;
  } else if (evidence.liquidity_depth === "moderate") {
    score += 2;
    breakdown.liquidity = 2;
  }

  const age = protocol.deployed_date
    ? (Date.now() - new Date(protocol.deployed_date).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  if (age > 180) {
    score += 4;
    breakdown.age = 4;
  } else if (age > 60) {
    score += 2;
    breakdown.age = 2;
  }

  const concentration = evidence.holder_concentration_pct;
  if (concentration !== null && concentration !== undefined) {
    if (concentration < 30) {
      score += 4;
      breakdown.concentration = 4;
    } else if (concentration < 50) {
      score += 2;
      breakdown.concentration = 2;
    } else {
      score -= 2;
      breakdown.concentration = -2;
    }
  }

  return { score: Math.max(0, Math.min(50, score)), score_max: 50, breakdown };
}

function mapGeminiToFirebase(json) {
  const result = {};

  if (isMeaningful(json.plain_summary)) result.plain_summary = json.plain_summary;
  if (isMeaningful(json.summary)) result.summary = json.summary;
  if (isMeaningful(json.deployed_date)) result.deployed_date = json.deployed_date;
  if (isMeaningful(json.contract_verified)) result.contract_verified = json.contract_verified;

  if (isMeaningful(json.risks)) {
    const risks = {};
    if (isMeaningful(json.risks.contract)) risks.contract = json.risks.contract;
    if (isMeaningful(json.risks.community)) risks.community = json.risks.community;
    if (isMeaningful(json.risks.structural)) risks.structural = json.risks.structural;
    if (Object.keys(risks).length > 0) result.risks = risks;
  }

  if (isMeaningful(json.funding)) {
    const funding = {};
    if (json.funding.has_funding_info !== undefined) funding.has_funding_info = json.funding.has_funding_info;
    if (isMeaningful(json.funding.investors)) funding.investors = json.funding.investors;
    if (isMeaningful(json.funding.source_note)) funding.source_note = json.funding.source_note;
    if (Object.keys(funding).length > 0) result.funding = funding;
  }

  if (isMeaningful(json.founder_history)) {
    const fh = {};
    if (json.founder_history.prior_projects_found !== undefined) fh.prior_projects_found = json.founder_history.prior_projects_found;
    if (isMeaningful(json.founder_history.details)) fh.details = json.founder_history.details;
    if (isMeaningful(json.founder_history.confidence_note)) fh.confidence_note = json.founder_history.confidence_note;
    if (Object.keys(fh).length > 0) result.founder_history = fh;
  }

  if (isMeaningful(json.use_cases)) result.use_cases = json.use_cases;
  if (isMeaningful(json.who_its_for)) result.who_its_for = json.who_its_for;
  if (isMeaningful(json.who_its_not_for)) result.who_its_not_for = json.who_its_not_for;
  if (isMeaningful(json.team)) result.team = json.team;
  if (isMeaningful(json.restricted_jurisdictions)) result.restricted_jurisdictions = json.restricted_jurisdictions;

  return result;
}

async function deepResearch(protocolId) {
  console.log(`[DEEP] deepResearch called for id: "${protocolId}"`);
  const protocol = await getById("protocols", protocolId);

  if (!protocol) {
    console.log(`[DEEP] Protocol ${protocolId} not found, skipping`);
    return { status: "skip", reason: "not_found" };
  }

  if (protocol.deep_research_status === "running") {
    console.log(`[DEEP] "${protocol.name}" already being researched, skipping`);
    return { status: "skip", reason: "already_running" };
  }

  if (protocol.deep_research_status === "completed") {
    console.log(`[DEEP] "${protocol.name}" already researched, skipping`);
    return { status: "skip", reason: "already_completed" };
  }

  try {
    await update("protocols", protocolId, {
      deep_research_status: "running",
      deep_research_error: null,
    });

    console.log(`[DEEP] Researching "${protocol.name}"...`);

    const prompt = DEEP_PROMPT.replace("{protocolData}", JSON.stringify({
      name: protocol.name,
      category: protocol.category,
      subcategory: protocol.subcategory,
      chain: protocol.chain,
      network: protocol.network,
      contracts: protocol.contracts,
      links: protocol.links,
      forensics: protocol.forensics,
    }, null, 2));

    console.log(`[DEEP] Calling Gemini for "${protocol.name}"...`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const json = JSON.parse(response.text);
    console.log(`[DEEP] Gemini response for "${protocol.name}":`, json);

    const evidence = json.evidence || {};
    delete json.evidence;

    const geminiFields = mapGeminiToFirebase(json);
    const merged = deepMerge(protocol, geminiFields);

    const { score, score_max, breakdown } = computeScore(evidence, merged);
    console.log(`[DEEP] Score computed for "${protocol.name}": ${score}/${score_max}`, breakdown);
    merged.score = score;
    merged.score_max = score_max;

    merged.deep_research_status = "completed";
    merged.deep_researched_at = new Date().toISOString();
    merged.deep_research_error = null;
    merged.deep_research_version = DEEP_RESEARCH_VERSION;

    normalizeProtocol(merged);

    const changes = findChanges(protocol, merged);
    if (changes.length === 0) {
      console.log(`[DEEP] "${protocol.name}" — no changes after research, marking completed`);
      await update("protocols", protocolId, {
        deep_research_status: "completed",
        deep_researched_at: new Date().toISOString(),
        deep_research_version: DEEP_RESEARCH_VERSION,
      });
      return { status: "completed", changes: 0 };
    }

    console.log(`[DEEP] "${protocol.name}" — ${changes.length} field(s) changed:`);
    for (const c of changes) {
      console.log(`  ${c.path}: ${JSON.stringify(c.old)} → ${JSON.stringify(c.new)}`);
    }

    await update("protocols", protocolId, merged);
    console.log(`[DEEP] Firebase updated for "${protocol.name}"`);
    console.log(`[DEEP] "${protocol.name}" — completed (score: ${score}/${score_max})`);

    return { status: "completed", score, score_max, breakdown, changes: changes.length };
  } catch (err) {
    console.error(`[DEEP] Research failed for "${protocol.name}":`, err.message);

    await update("protocols", protocolId, {
      deep_research_status: "failed",
      deep_research_error: err.message,
      deep_researched_at: null,
    }).catch((fbErr) => {
      console.error(`[DEEP] Failed to record error in Firebase:`, fbErr.message);
    });

    return { status: "failed", error: err.message };
  }
}

module.exports = { deepResearch };
