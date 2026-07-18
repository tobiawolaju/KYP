require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");
const { GoogleGenAI } = require("@google/genai");
const { query, update } = require("./db");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function getLogoFromWebsite(website) {
  if (!website) return "";

  try {
    const { data } = await axios.get(website, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);

    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="mask-icon"]',
    ];

    for (const selector of selectors) {
      const href = $(selector).attr("href");
      if (href) {
        return new URL(href, website).href;
      }
    }

    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) {
      return new URL(ogImage, website).href;
    }

    // fallback
    return new URL("/favicon.ico", website).href;
  } catch (err) {
    console.warn("Logo fetch failed:", err.message);
    return "";
  }
}

async function flashResearch(protocol) {
  const prompt = `
[protocol] = ${protocol}

Using this query [protocol], return a TRUE JSON object with exactly this structure:

{
  "protocolName": "",
  "description": "",
  "category": "",
  "allCategories": "",
  "chain": "",
  "website": "",
  "logo": "",
  "socials": {
    "x": "",
    "telegram": "",
    "discord": ""
  },
  "contracts": [],
  "contract_address": "",
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

- allCategories MUST contain all categories separated by "::"
  Example:
  "DeFi::DEX::AMM"

- contracts MUST be an array of deployed contract addresses.

- contract_address MUST be the primary contract address if one exists,
  otherwise "".

- deployed_date should be YYYY-MM-DD when known, otherwise "".

- age_summary should be a short string such as:
  "2 years"
  "18 months"
  "Unknown"

- If information cannot be verified, return "".
`;

  try {
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

      const protocols = await query("protocols", (p) =>
        p.name && normalize(p.name) === queryName
      );

      if (protocols.length === 0) {
        console.log(`[FLASH] No Firebase match for "${json.protocolName}", skipping update`);
        return { status: "proceed", data: json };
      }

      const existing = protocols[0];

      if (!needsResearch(existing)) {
        console.log(`[FLASH] "${existing.name}" already has valid image, skipping`);
        return { status: "proceed", data: json };
      }

      const logo = await getLogoFromWebsite(json.website);
      json.logo = logo;

      const geminiFields = mapGeminiToFirebase(json);
      const merged = deepMerge(existing, geminiFields);

      merged.image = logo || existing.image;

      if (!isValidProtocol(merged)) {
        console.error(`[FLASH] Merge validation failed for "${existing.name}". Skipping Firebase update.`);
        return { status: "proceed", data: json };
      }

      const changes = findChanges(existing, merged);

      if (changes.length === 0) {
        console.log(`[FLASH] "${existing.name}" — no changes, skipping write`);
        return { status: "proceed", data: json };
      }

      console.log(`[FLASH] "${existing.name}" — ${changes.length} field(s) changed:`);
      for (const c of changes) {
        console.log(`  ${c.path}: ${JSON.stringify(c.old)} → ${JSON.stringify(c.new)}`);
      }

      await update("protocols", existing.id, merged);
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

function isMeaningful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function isRealImage(value) {
  if (!value || typeof value !== "string") return false;
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
}

function needsResearch(protocol) {
  return !isRealImage(protocol.image);
}

function isValidProtocol(protocol) {
  if (!protocol.id) return false;
  if (!protocol.name || typeof protocol.name !== "string") return false;
  if (!protocol.category || typeof protocol.category !== "string") return false;
  if (!protocol.links || typeof protocol.links !== "object" || Array.isArray(protocol.links)) return false;
  return true;
}

function mapGeminiToFirebase(json) {
  const links = {};

  if (isMeaningful(json.website)) links.project = json.website;
  if (isMeaningful(json.socials?.x)) links.twitter = json.socials.x;
  if (isMeaningful(json.socials?.discord)) links.discord = json.socials.discord;
  if (isMeaningful(json.socials?.telegram)) links.telegram = json.socials.telegram;

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
  if (isMeaningful(json.allCategories)) result.allCategories = json.allCategories;
  if (isMeaningful(json.chain)) result.chain = json.chain;
  if (isMeaningful(json.contract_address)) result.contract_address = json.contract_address;
  if (isMeaningful(json.deployed_date)) result.deployed_date = json.deployed_date;
  if (isMeaningful(json.age_summary)) result.age_summary = json.age_summary;
  if (isMeaningful(json.contracts)) result.contracts = json.contracts;

  if (Object.keys(links).length > 0) result.links = links;
  if (Object.keys(forensics).length > 0) result.forensics = forensics;
  if (Object.keys(founderHistory).length > 0) result.founder_history = founderHistory;

  return result;
}

function deepMerge(firebaseData, geminiData) {
  const result = {};

  for (const key of Object.keys(firebaseData)) {
    const val = firebaseData[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      result[key] = {};
    } else {
      result[key] = val;
    }
  }

  for (const key of Object.keys(geminiData)) {
    const geminiVal = geminiData[key];

    if (!isMeaningful(geminiVal)) continue;

    const firebaseVal = firebaseData[key];

    const bothObjects =
      firebaseVal !== null &&
      typeof firebaseVal === "object" &&
      !Array.isArray(firebaseVal) &&
      geminiVal !== null &&
      typeof geminiVal === "object" &&
      !Array.isArray(geminiVal);

    if (bothObjects) {
      result[key] = deepMerge(firebaseVal, geminiVal);
    } else {
      result[key] = geminiVal;
    }
  }

  return result;
}

function findChanges(existing, updated, prefix) {
  const changes = [];
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(updated)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = existing[key];
    const newVal = updated[key];

    const bothObjects =
      oldVal !== null &&
      typeof oldVal === "object" &&
      !Array.isArray(oldVal) &&
      newVal !== null &&
      typeof newVal === "object" &&
      !Array.isArray(newVal);

    if (bothObjects) {
      changes.push(...findChanges(oldVal, newVal, path));
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path, old: oldVal, new: newVal });
    }
  }

  return changes;
}

module.exports = { flashResearch };
