require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { getById, update, normalizeProtocol } = require("./db");
const { isMeaningful, isRealImage, deepMerge, findChanges } = require("./merge");
const { deepResearch } = require("./deepResearcher");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// TODO(Hackathon):
// We currently use Google's favicon service because it is fast and
// reliable for most websites. After the hackathon replace this with
// a dedicated logo provider (Brandfetch / Logo.dev / custom scraper)
// to obtain higher-resolution brand logos instead of favicons.
async function getLogoFromWebsite(website) {
  if (!website) return "";

  try {
    const url = new URL(website);

    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url.origin)}&size=256`;
  } catch (err) {
    console.warn("Logo URL generation failed:", err.message);
    return "";
  }
}

async function flashResearch(protocol, network = "testnet") {
  console.log(`[FLASH] Starting flash research for "${protocol}" (network: ${network})`);

  const prompt = `
[protocol] = ${protocol}

Using this query [protocol], return a TRUE JSON object with exactly this structure:

{
  "protocolName": "",
  "description": "",
  "category": "",
  "chain": "",
  "website": "",
  "logo": "",
  "socials": {
    "x": "",
    "telegram": "",
    "discord": ""
  },
  "contracts": [],
  "deployed_date": "",
  "age_summary": "",
  "forensics": {
    "admin_function_notes": "",
    "deployer_wallet_age": "",
    "founder_history": "",
    "confidence_note": "",
    "details": ""
  }
}

Rules:
- [protocol] is a Web3 protocol.
- Return ONLY valid JSON.
- No markdown.
- No explanation.
- No code block.
- description should be concise (1-3 sentences).
- chain must be an array.
- tags must be an array.
- website must be the OFFICIAL website.
- x must be the OFFICIAL X account.
- telegram must be the OFFICIAL Telegram URL or "".
- discord must be the OFFICIAL Discord invite URL or "".
- Verify links before returning them.
Rules:
- chain MUST be a comma-separated string.
  Example:
  "Ethereum, Base, Arbitrum"

  NOT:
  ["Ethereum","Base","Arbitrum"]

- category MUST contain the primary category only.
  Example:
  "DeFi"

- contracts MUST be an array of deployed contract addresses.

- deployed_date should be YYYY-MM-DD when known, otherwise "".

- age_summary should be a short string such as:
  "2 years"
  "18 months"
  "Unknown"

- If information cannot be verified, return "".
`;

  try {
    console.log(`[FLASH] Calling Gemini for "${protocol}"...`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const json = JSON.parse(response.text);

    console.log("[FLASH] Gemini response:", json);

    try {
      const normalize = (s) => s.toLowerCase().replace(/[\s\-_.]/g, "");
      const queryName = normalize(json.protocolName);

      const targetId = normalize(json.protocolName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + network;
      const existing = await getById("protocols", targetId);

      if (!existing) {
        console.log(
          `[FLASH] No Firebase match for "${json.protocolName}" (id: ${targetId}), skipping update`,
        );
        return { status: "proceed", data: json };
      }
      console.log(`[FLASH] Matched Firebase protocol: "${existing.name}" (id: ${existing.id})`);

      if (!needsResearch(existing)) {
        console.log(
          `[FLASH] "${existing.name}" already has valid image, skipping`,
        );
        return { status: "proceed", data: json };
      }

      const logo = await getLogoFromWebsite(json.website);
      json.logo = logo;

      const geminiFields = mapGeminiToFirebase(json);
      const merged = deepMerge(existing, geminiFields);

      merged.image = logo || existing.image;

      normalizeProtocol(merged);

      if (!isValidProtocol(merged)) {
        console.error(
          `[FLASH] Merge validation failed for "${existing.name}". Skipping Firebase update.`,
        );
        return { status: "proceed", data: json };
      }

      const changes = findChanges(existing, merged);

      if (changes.length === 0) {
        console.log(`[FLASH] "${existing.name}" — no changes, skipping write`);
        return { status: "proceed", data: json };
      }

      console.log(
        `[FLASH] "${existing.name}" — ${changes.length} field(s) changed:`,
      );
      for (const c of changes) {
        console.log(
          `  ${c.path}: ${JSON.stringify(c.old)} → ${JSON.stringify(c.new)}`,
        );
      }

      await update("protocols", existing.id, merged);
      console.log(`[FLASH] Firebase updated for "${existing.name}"`);

      if (merged.deep_research_status === "pending" && merged.score === null) {
        console.log(`[FLASH] Triggering DeepResearcher for "${existing.name}"`);
        deepResearch(existing.id).catch((err) => {
          console.error(`[FLASH] DeepResearcher trigger failed for "${existing.name}":`, err.message);
        });
      }
    } catch (fbErr) {
      console.error("[FLASH] Firebase check/update failed:", fbErr.message);
    }

    return {
      status: "proceed",
      data: json,
    };
  } catch (err) {
    console.error(err);

    return {
      status: "error",
      error: err.message,
    };
  }
}

function needsResearch(protocol) {
  return !isRealImage(protocol.image);
}

function isValidProtocol(protocol) {
  if (!protocol.id) return false;
  if (!protocol.name || typeof protocol.name !== "string") return false;
  if (!protocol.category || typeof protocol.category !== "string") return false;
  if (
    !protocol.links ||
    typeof protocol.links !== "object" ||
    Array.isArray(protocol.links)
  )
    return false;
  return true;
}

function mapGeminiToFirebase(json) {
  const links = {};

  if (isMeaningful(json.website)) links.project = json.website;
  if (isMeaningful(json.socials?.x)) links.twitter = json.socials.x;
  if (isMeaningful(json.socials?.discord)) links.discord = json.socials.discord;
  if (isMeaningful(json.socials?.telegram))
    links.telegram = json.socials.telegram;

  const forensics = {};

  if (isMeaningful(json.forensics?.admin_function_notes))
    forensics.admin_function_notes = json.forensics.admin_function_notes;
  if (isMeaningful(json.forensics?.deployer_wallet_age))
    forensics.deployer_wallet_age = json.forensics.deployer_wallet_age;

  const founderHistory = {};

  if (isMeaningful(json.forensics?.founder_history))
    founderHistory.details = json.forensics.founder_history;
  if (isMeaningful(json.forensics?.confidence_note))
    founderHistory.confidence_note = json.forensics.confidence_note;
  if (isMeaningful(json.forensics?.details) && !founderHistory.details)
    founderHistory.details = json.forensics.details;

  const result = {};

  if (isMeaningful(json.description)) result.summary = json.description;
  if (isMeaningful(json.category)) result.category = json.category;
  if (isMeaningful(json.chain)) result.chain = json.chain;
  if (isMeaningful(json.deployed_date))
    result.deployed_date = json.deployed_date;
  if (isMeaningful(json.age_summary)) result.age_summary = json.age_summary;
  if (isMeaningful(json.contracts)) result.contracts = json.contracts;

  if (Object.keys(links).length > 0) result.links = links;
  if (Object.keys(forensics).length > 0) result.forensics = forensics;
  if (Object.keys(founderHistory).length > 0)
    result.founder_history = founderHistory;

  return result;
}

module.exports = { flashResearch };
