# KYP — Build Plan / Checklist

Goal: win a Winner slot ($500 x3). Judged on elegance + execution, checked live by a judging agent for placeholder data, fake commits, and vaporware.

Scope discipline rule: if a step isn't done by its deadline, cut it — don't let it bleed into the next phase. A smaller thing that works beats a bigger thing that's broken on demo day.

---

## Architecture — Two-Agent Research Pipeline

KYP uses a two-agent research architecture. Both agents call Gemini, but they serve different purposes and run at different times.

### Agent 1: FlashResearcher (built, live)

Fast enrichment. Triggers on every user search.

**Flow:** User searches "kuru" → FlashResearcher calls Gemini → merges result into Firebase protocol record → frontend navigates to Explore. If protocol has no score yet, fires DeepResearcher in background (fire-and-forget).

**What it fills:**
- summary, category, subcategory, chain
- links (project, twitter, discord)
- contracts[] (contract name + address array)
- deployed_date, age_summary
- forensics (admin_function_notes, deployer_wallet_age)
- founder_history (details, confidence_note)
- image (via Google favicon service)

**What it does NOT fill:**
- score / score_max (DeepResearcher handles this)
- risks, funding, use_cases, team (DeepResearcher handles these)
- who_its_for / who_its_not_for (DeepResearcher handles these)
- plain_summary (DeepResearcher handles this)

**Guarantees:**
- Canonical protocol schema via `normalizeProtocol()` — every protocol in Firebase has the same shape
- Contract addresses live in `contracts[]` array (sole source of truth)
- Never overwrites existing Firebase data with empty values (deepMerge + isMeaningful)
- Skips protocols that already have a real image (already researched)
- Logs every field change for debugging
- Shared merge utilities extracted to `services/merge.js`
- **Network-aware**: matches by protocol ID (`slugified-name-network`), not by name — prevents cross-network collisions

### Agent 2: DeepResearcher (built, live)

Deep analysis. Triggers automatically after FlashResearcher enrichment, or on-demand via API.

**Flow:** FlashResearcher finishes enrichment → checks if `deep_research_status === "pending"` and `score === null` → fires `deepResearch(id)` as detached async call → returns immediately to user.

**What it fills:**
- **plain_summary** — human-readable protocol description
- **score / score_max** — deterministic scoring from Gemini evidence (8 weighted signals)
- **risks** (contract, community, structural) — risk analysis from Gemini
- **funding** (has_funding_info, investors, source_note)
- **use_cases** — extracted from protocol analysis
- **who_its_for / who_its_not_for** — user persona analysis
- **team** — team member research
- **restricted_jurisdictions** — regulatory awareness
- **contract_verified** — on-chain verification status

**Concurrency:** Firebase atomic lock — sets `deep_research_status = "running"` before starting. If already `running`, skips.

**Failure:** Sets `status = "failed"` + `deep_research_error`. No auto-retry. Retries on next search if user searches the same protocol again.

**Scoring:** Gemini returns `evidence` object. Backend computes score deterministically from 8 signals:
| Signal | Weight | Condition |
|---|---|---|
| Audit | +10 | Known auditor |
| Team verified | +8 | Public team |
| Contract verified | +8 | On-chain verified |
| Funding | +6 | Has funding info |
| Community | +3-6 | Large/medium |
| Admin risk | +3-6 | Low/medium |
| Liquidity | +2-4 | Deep/moderate |
| Age | +2-4 | >60 or >180 days |
| Concentration | -2 to +4 | Holder distribution |

Score range: 0–50, mapped to 5 tiers (Rug potential / High risk / Caution / Solid / Secured).

**Shared utilities:** `deepMerge`, `isMeaningful`, `findChanges` extracted to `services/merge.js` — used by both agents.

### Why two agents instead of one?

1. **User experience** — Search is instant (< 5s). Deep research takes time. Don't block the search flow.
2. **Cost** — Flash is cheap (single Gemini call). Deep is expensive (analysis + scoring).
3. **Reliability** — Flash failing doesn't break search. Deep failing doesn't break the app.
4. **Progressive enhancement** — Protocol works with just Flash. Deep makes it better.

---

## Phase 0 — Architecture ✅ DONE

- [x] Define the exact data model for a "protocol research" record
- [x] Define the exact data model for a "commitment"
- [x] Decide the single onchain "did they actually engage" check
- [x] Sketch the screens you actually need
- [x] Write down what you are explicitly NOT building

## Phase 1 — Smart Contract ✅ DONE

Contract: [`KYPCommitment.sol`](./Contract/src/KYPCommitment.sol). Tests: [`KYPCommitment.t.sol`](./Contract/test/KYPCommitment.t.sol) (Foundry — 20/20 passing).

- [x] Write `KYPCommitment.sol`: stake, verify, slash, withdrawForfeited
- [x] Deploy to Monad Testnet — verified on Sourcify
- [x] Deploy to Monad Mainnet — identical logic
- [x] Test manually: stake ✅, verify ✅, slash ✅
- [x] ABI exported to `Contract/abi/KYPCommitment.json`

**Contract addresses:**
- Testnet: `0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf`
- Mainnet: `0x8bf8348963c366d9ba210ddc8574caa7522335f8`

## Phase 2 — Backend ✅ DONE

- [x] Node.js/Express server on Render
- [x] FlashResearcher: Gemini enrichment → Firebase (deep merge, normalization, change detection)
- [x] DeepResearcher: Gemini deep analysis → evidence-based deterministic scoring → Firebase
- [x] Shared merge utilities extracted to `services/merge.js`
- [x] Canonical protocol schema via `normalizeProtocol()` — 4 deep research fields included
- [x] `GET /protocols` and `GET /protocols/:id` — normalized responses, `?network=` filter
- [x] `POST /flash-research` — triggers FlashResearcher (accepts `network` param)
- [x] `POST /deep-research/:protocolId` — manual DeepResearcher trigger
- [x] Firebase Realtime Database abstraction
- [x] Seed script: `--mainnet` flag, network-scoped IDs, network-aware deletion
- [x] 226 testnet protocols seeded with full schema including deep research fields
- [x] Heartbeat worker: `POST /worker/tick` with lock guard + 5-min throttle
- [x] Worker core logic extracted to `services/worker.js` (importable module)
- [x] Multi-network contract support: `getNetworkConfig(network)` routes RPC + contract calls
- [x] Protocol-agnostic engagement: `getLogs` with user address as topic, filtered by protocol
- [x] Adaptive block estimation: fetches real chain data, not hardcoded 2s
- [x] `callVerify`/`callSlash` always target KYP contract via `getNetworkConfig()`
- [x] Commit route accepts `network` field, stores in commitment record
- [x] `GET /commitments` supports `?network=` filter
- [x] Worker intervals configurable via env vars (CHECK_INTERVAL_MS, SNAPSHOT_INTERVAL_MS, MIN_INTERVAL_MS)

## Phase 3 & 4 — Frontend ✅ DONE

Stack: Svelte 5 + Vite, Monad-brand-inspired white + dark theme, Privy for wallet auth, viem for on-chain writes.

Built and live:
- [x] Visual identity locked and applied consistently
- [x] Routing: `/`, `/protocol/:id`, `/protocols`, `/myprotocols`, `/myprotocols/commit/:id`
- [x] Home — hero with grid background, search bar, featured protocols grid
- [x] Protocol page — ScoreBadge shield (5-tier) in header, who it's for, risks, SVG link icons, favorite toggle, commit modal
- [x] Explore — filter by category, score range, search, clean cards (network-aware)
- [x] Dashboard — wallet address, total staked, activity grid, per-protocol commit graphs
- [x] Commit Detail page — expanded commit graph + activity list + stake balance
- [x] CommitGraph component — reusable, mini/expanded sizes
- [x] Frontend guards for missing protocol fields (hide empty sections, never crash)
- [x] ScoreBadge always renders (defaults to 0/Rug potential for unscored protocols)
- [x] DeepResearcher integration — orange countdown banner, auto-refresh every 40s while pending/running
- [x] Wire real wallet connect via Privy end-to-end
- [x] Wire real contract calls for `stake()` from the commit modal (viem, not ethers)
- [x] Dark mode: full support including persona-card.caution, caution-tag, verification-badge, deep-research-banner
- [x] **Testnet/Mainnet network toggle** — segmented pill in navbar (active=purple, inactive=grey)
- [x] Network toggle changes: viem chain, KYP contract address, Explore filter, Dashboard filter, flash research network
- [x] Protocol detail validates network match before allowing stake
- [x] Friendly error messages for stake failures (chain mismatch, user rejected, insufficient funds)
- [x] Heartbeat component: 30s interval, visibility-aware, auth-gated
- [x] Light/Dark theme toggle — segmented pill in navbar

## Phase 5 — Integration + End-to-End Test ✅ DONE

- [x] Full flow test: search → FlashResearcher enriches → DeepResearcher scores → protocol page updates
- [x] Heartbeat worker: frontend pings POST /worker/tick every 30s (visibility-aware, auth-gated)
- [x] Worker 3-strike verification: verify/slash against live demo contract
- [x] Worker tests: 4/4 paths passed against KYPCommitmentDemo (timestamp-shifting method)
- [x] Test DeepResearcher concurrency: search same protocol twice simultaneously, verify only one runs
- [x] Test DeepResearcher failure: search nonsense → verify `failed` state + error message stored
- [x] Multi-network commit flow: stake on testnet → commitment stores network → worker routes correctly
- [x] Network-scoped protocol records: seed script creates `slug-network` IDs, no collisions
- [x] Flash researcher matches by ID (not name), network param flows through entire chain
- [x] Dashboard and Explore both filter by current network toggle
- [x] CommitDetail fetches protocol by network-scoped `commitment.protocol_id`

## Phase 6 — Polish + Submission Assets

- [x] Finalize README (problem, solution, stack, links, verified test results, architecture highlights)
- [x] Architecture.MD updated (multi-network data model, protocol-agnostic engagement, two-agent pipeline)
- [ ] Record demo video (under 3 min): search → Flash → Deep → commit → stake → verify
- [ ] Write submission form answers (Description, Problem, Solution)
- [x] Push final commits with clear messages
- [ ] Post about it on X, grab the post URL for submission
- [ ] Double check: contract address included, testnet labeled, project URL live
- [ ] Full run-through as a stranger — open cold, try the flow, time under 3 minutes

---

## Current status snapshot

**Done:** All phases complete except Phase 6 polish items (demo video, submission form, X post, stranger test).

**Infrastructure:**
- 2 smart contracts deployed (Testnet + Mainnet)
- 2-agent research pipeline (Flash + Deep) with network-aware matching
- Protocol-agnostic engagement detection (any on-chain event, not specific signatures)
- Heartbeat-driven worker (zero budget, no paid Background Worker)
- Multi-network support: seed script, frontend toggle, backend RPC routing, network-scoped protocol IDs
- Adaptive block estimation (real chain data, not hardcoded)
- Correct contract targeting: `callVerify`/`callSlash` always hit KYP contract, never protocol contract

**Schema (canonical):** id, name, image, chain, network, category, subcategory, plain_summary, summary, who_its_for, who_its_not_for, deployed_date, age_summary, team_as_of, score, score_max, contract_verified, links{}, risks{}, forensics{}, funding{}, founder_history{}, contracts[], use_cases[], team[], restricted_jurisdictions[], deep_research_status, deep_researched_at, deep_research_error, deep_research_version, created_at, created_by_wallet

**Seeded:** 226 testnet protocols (mainnet CSV template ready for population)

**Verified:** Heartbeat worker 4/4 paths against KYPCommitmentDemo. Test harness: `Backend/tests/demo-test-fast.js`

**Firebase paths:** `/protocols` (network-scoped), `/commitments` (network field), `/favorites` (network-scoped protocol_id), `/activity_events`

**Next up:** Demo video, submission form answers, X post, full stranger test.
