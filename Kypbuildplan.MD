# KYP — Build Plan / Checklist

Goal: win a Winner slot ($500 x3). Judged on elegance + execution, checked live by a judging agent for placeholder data, fake commits, and vaporware.

Scope discipline rule: if a step isn't done by its deadline, cut it — don't let it bleed into the next phase. A smaller thing that works beats a bigger thing that's broken on demo day.

---

## Architecture — Two-Agent Research Pipeline

KYP uses a two-agent research architecture. Both agents call Gemini, but they serve different purposes and run at different times.

### Agent 1: FlashResearcher (built, live)

Fast enrichment. Triggers on every user search.

**Flow:** User searches "kuru" → FlashResearcher calls Gemini → merges result into Firebase protocol record → frontend navigates to Explore.

**What it fills:**
- summary, category, subcategory, chain
- links (project, twitter, discord)
- contracts[] (contract name + address array)
- deployed_date, age_summary
- forensics (admin_function_notes, deployer_wallet_age)
- founder_history (details, confidence_note)
- image (via Google favicon service)

**What it does NOT fill:**
- score / score_max (no scoring logic yet)
- risks (no risk analysis yet)
- funding (no funding research yet)
- use_cases (no use-case extraction yet)
- team, restricted_jurisdictions
- who_its_for / who_its_not_for
- deep_research_status (managed by DeepResearcher, defaults to "pending")
- deep_researched_at (managed by DeepResearcher, defaults to null)

**Guarantees:**
- Canonical protocol schema via `normalizeProtocol()` — every protocol in Firebase has the same shape
- Contract addresses live in `contracts[]` array (sole source of truth)
- `plain_summary` field reserved for DeepResearcher (not yet filled)
- Never overwrites existing Firebase data with empty values (deepMerge + isMeaningful)
- Skips protocols that already have a real image (already researched)
- Logs every field change for debugging

### Agent 2: DeepResearcher (planned, not built)

Deep analysis. Triggers separately (on-demand or scheduled).

**Purpose:** Fill the fields FlashResearcher doesn't — the fields that require deeper analysis, cross-referencing, and judgment calls.

**What it would fill:**
- **plain_summary** — human-readable protocol description (1-3 sentences, different from Gemini's `summary`)
- **score / score_max** — computed from on-chain data, audit status, team doxxing, funding, community strength
- **risks** (contract, community, structural) — actual risk analysis, not just data extraction
- **funding** (has_funding_info, investors, source_note) — funding research from public sources
- **use_cases** — extracted from protocol docs/code, not just Gemini's guess
- **who_its_for / who_its_not_for** — user persona analysis
- **team** — team member research, prior projects, doxxing status
- **restricted_jurisdictions** — regulatory awareness
- **contract_verified** — on-chain verification status

**How it differs from FlashResearcher:**
| | FlashResearcher | DeepResearcher |
|---|---|---|
| Speed | < 5s | 30s–2min |
| Trigger | Every search | On-demand / scheduled |
| Depth | Surface data extraction | Deep analysis + scoring |
| Risk | Low (enrichment only) | Higher (writes scores, risks) |
| Prompt | Single factual prompt | Multi-step analysis prompt |

**Architecture options (TBD):**
1. **Sequential:** FlashResearcher runs first (fast), DeepResearcher runs after (background)
2. **On-demand:** User clicks "Deep Research" on a protocol page
3. **Scheduled:** Cron job runs DeepResearcher on all protocols nightly
4. **Hybrid:** Flash on search + Deep on first visit to protocol page

### Why two agents instead of one?

1. **User experience** — Search is instant (< 5s). Deep research takes time. Don't block the search flow.
2. **Cost** — Flash is cheap (single Gemini call). Deep is expensive (multiple calls, web scraping, analysis).
3. **Reliability** — Flash failing doesn't break search. Deep failing doesn't break the app.
4. **Progressive enhancement** — Protocol works with just Flash. Deep makes it better.

### The scoring problem

Currently, `score` is static seed data. No agent computes it. This is the single biggest gap in the product — the score shield is the hero UI element, but it's fake.

DeepResearcher must solve this. Score computation should consider:
- Contract audit status (audited = higher score)
- Team doxxing (public team = higher score)
- Funding (VC-backed = higher score, but also = centralization risk)
- Community size and activity
- Deployment age (older = more trusted)
- Admin function risk (upgradeable = lower score)
- Top holder concentration (high = lower score)

Score range: 0–50, mapped to 5 tiers (Rug potential / High risk / Caution / Solid / Secured).

---

## Phase 0 — Architecture (tonight, ~45 min) ✅ DONE

- [x] Define the exact data model for a "protocol research" record → see `ARCHITECTURE.md`
- [x] Define the exact data model for a "commitment" → see `ARCHITECTURE.md`
- [x] Decide the single onchain "did they actually engage" check
- [x] Sketch the 3 screens you actually need
- [x] Write down what you are explicitly NOT building tonight

## Phase 1 — Smart Contract (tonight, ~1.5–2 hrs)

Contract drafted: [`KYPCommitment.sol`](./KYPCommitment.sol). Test suite drafted: [`KYPCommitment.t.sol`](./KYPCommitment.t.sol) (Foundry — 9 tests covering stake, verify, slash, deadline edges, access control, and withdraw).

- [x] Write `KYPCommitment.sol`: stake function (payable, records amount + protocol address + wallet)
- [x] Write verify function: checks status + deadline, callable only by `verifier` (backend wallet), returns stake to user
- [x] Write slash logic: callable only by `verifier`, only after deadline passes, forfeits stake to contract's pool (not burned — sits as withdrawable balance)
- [x] Add `withdrawForfeited(amount, to)`: owner-only, can only pull from forfeited balance (`contract balance − activeStakedTotal`), so active user stakes can never be touched
- [x] Set up Foundry project locally, drop in `KYPCommitment.sol` under `src/` and `KYPCommitment.t.sol` under `test/`
- [x] Run `forge test -vv` — all 9 tests pass
- [x] Generate a verifier wallet separate from deployer, kept server-side only
- [x] Deploy to Monad Testnet (chain 10143) via `forge script` — deploy tx in block 45071659
- [x] Verify contract on Monad explorer via Sourcify (MonadVision) — exact match confirmed: https://testnet.monadvision.com/address/0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0
- [x] Test manually on testnet: `stake()` ✅, `verify()` ✅ (0.01 MON returned to staker)
- [x] Test manually on testnet: `slash()` ✅ — via `KYPCommitmentDemo` (5-min window twin contract), stake → deadline expiry → slash → `forfeitedBalance()` confirmed 0.01 MON forfeited
- [x] Save contract address + ABI: `KYP_CONTRACT_ADDRESS` in `.env`, ABI exported to `contract/abi/KYPCommitment.json`
- [x] Push repo to GitHub: https://github.com/tobiawolaju/KYP (public, clean logical commit history)

**Contract address (official submission, testnet):** `0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0`
**Demo contract (5-min window, slash-path footage only):** `0x98c3e4594ecfa1c45e8056932652b04cdea64e5d`

### Phase 1 — COMPLETE ✅

All contract work done: written, tested (20/20 including demo twin), deployed, verified on explorer, exercised live on testnet (stake, verify, and slash all confirmed with real tx hashes), and pushed to a public GitHub repo with clean commit history.

## Phase 2 — Backend ✅ MOSTLY DONE

Built and live:
- [x] Node.js/Express server on Render
- [x] FlashResearcher agent: Gemini research → Firebase enrichment (deep merge, normalization, change detection)
- [x] Canonical protocol schema via `normalizeProtocol()` — every protocol in Firebase has the same shape
- [x] `GET /protocols` and `GET /protocols/:id` — normalized responses
- [x] `POST /flash-research` — triggers FlashResearcher, returns status
- [x] Logo scraping replaced with Google favicon service (no axios/cheerio dependency)
- [x] Firebase Realtime Database abstraction (getAll, getById, insert, update, query)
- [x] Seed script pulls from Monad testnet registry CSV

Still TODO:
- [ ] DeepResearcher agent — fills score, risks, funding, use_cases, team, who_its_for/not_for (see Architecture section above)
- [ ] Build `/commit` endpoint: writes commitment record, triggers/records the onchain stake tx
- [ ] Build `/verify` endpoint: reads onchain activity for a wallet + protocol pair, updates commitment status
- [ ] Build scheduled auto-resolution script: periodic job that scans all `active` commitments, checks each via RPC, and calls `verify()` or `slash()` on the ones that are due
- [ ] Add basic error handling (bad link, LLM failure, RPC failure) — no unhandled crashes during a live demo

## Phase 3 & 4 — Frontend ✅ MOSTLY DONE

Stack: Svelte + Vite, Monad-brand-inspired white theme, Privy for wallet auth.

Built and live:
- [x] Visual identity locked and applied consistently
- [x] Routing: `/`, `/protocol/:id`, `/protocols`, `/dashboard`, `/dashboard/commit/:id`
- [x] Home — hero with grid background, featured protocols grid
- [x] Protocol page — ScoreBadge shield (5-tier), who it's for, risks, links, favorite toggle, similar protocols, commit modal
- [x] Explore — filter by category, score range, search
- [x] Dashboard — wallet address, total staked, activity grid, per-protocol commit graphs
- [x] Commit Detail page — expanded commit graph + activity list + stake balance
- [x] CommitGraph component — reusable, mini/expanded sizes
- [x] Frontend guards for missing protocol fields (hide empty sections, never crash)
- [x] ScoreBadge always renders (defaults to 0/Rug potential for unscored protocols)

Still TODO:
- [ ] Wire real wallet connect via Privy end-to-end
- [ ] Replace dummy data reads with real backend calls
- [ ] Wire real contract calls for `stake()` from the commit modal
- [ ] DeepResearcher integration — show "Analyzing..." state when DeepResearcher is running, update protocol page live when results arrive

## Phase 5 — Integration + End-to-End Test

- [ ] Full flow test: search a protocol → FlashResearcher enriches → protocol page loads with full data
- [ ] Test DeepResearcher flow: trigger deep analysis → score/risks/funding populated → protocol page updates
- [ ] Test the FAIL path: commit, don't engage, confirm slash logic actually triggers (judges may test this)
- [ ] Test with a fresh wallet with zero prior history — make sure app doesn't break on empty state
- [ ] Fix broken states, loading states, error states — no blank screens
- [ ] Test normalization: search for a brand-new protocol not in seed data → verify it gets full schema in Firebase

## Phase 6 — Polish + Submission Assets

- [ ] Finalize README (problem, solution, stack, links)
- [ ] Record demo video (under 3 min): show search → FlashResearcher enriches → DeepResearcher scores → commit → stake → verify, live, no cuts hiding fake data
- [ ] Write submission form answers (Description, Problem, Solution)
- [ ] Push final commits with clear messages (avoid "final final v2" — judging agent checks commit history)
- [ ] Post about it on X, grab the post URL for submission
- [ ] Double check: contract address included, testnet clearly labeled, project URL live and working
- [ ] Do a full run-through as a stranger would — open the link cold, try the flow, time yourself under 3 minutes

---

## Current status snapshot

**Done:** Phase 0 (architecture), Phase 1 (contract deployed + tested), Phase 2 (FlashResearcher + normalization + schema cleanup), Phase 3&4 (frontend mostly built)

**Schema (canonical):** id, name, image, chain, network, category, subcategory, plain_summary (null), summary, who_its_for, who_its_not_for, deployed_date, age_summary, team_as_of, score, score_max, contract_verified, links{}, risks{}, forensics{}, funding{}, founder_history{}, contracts[]{name, address, type}, use_cases[], team[], restricted_jurisdictions[], deep_research_status ("pending"), deep_researched_at (null), created_at, created_by_wallet

**Seeded:** 226 protocols from Monad testnet registry CSV (no contract_address, no allCategories — removed from schema). All protocols include `deep_research_status: "pending"` and `deep_researched_at: null`.

**Next up:** DeepResearcher agent (the scoring/risk engine, fills plain_summary + score + risks + funding + use_cases + team + who_its_for/not_for), then Phase 5 integration, then Phase 6 polish.

**Key risk:** Score is still static seed data. DeepResearcher is the single most important missing piece — it turns a demo with fake scores into a real product.
