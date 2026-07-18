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

    const logo = await getLogoFromWebsite(json.socials.website);

    json.logo = logo;

    console.log(json);

    try {
      const normalize = (s) => s.toLowerCase().replace(/[\s\-_.]/g, "");
      const queryName = normalize(json.protocolName);

      const protocols = await query("protocols", (p) =>
        p.name && normalize(p.name) === queryName
      );

      if (protocols.length > 0) {
        const existing = protocols[0];
        const img = existing.image;

        if (!img || img === "" || img === null) {
          await update("protocols", existing.id, { image: logo });
          console.log(`[FLASH] Updated protocol "${existing.name}" image → ${logo}`);
        }
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

module.exports = { flashResearch };
