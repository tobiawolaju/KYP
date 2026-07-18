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
- [x] Sketch the 3 screens you actually need
- [x] Write down what you are explicitly NOT building

## Phase 1 — Smart Contract ✅ DONE

Contract: [`KYPCommitment.sol`](./KYPCommitment.sol). Tests: [`KYPCommitment.t.sol`](./KYPCommitment.t.sol) (Foundry — 20/20 passing).

- [x] Write `KYPCommitment.sol`: stake, verify, slash, withdraw
- [x] Deploy to Monad Testnet — verified on Sourcify
- [x] Test manually: stake ✅, verify ✅, slash ✅
- [x] ABI exported to `contract/abi/KYPCommitment.json`

**Contract address:** `0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0`

## Phase 2 — Backend ✅ DONE

- [x] Node.js/Express server on Render
- [x] FlashResearcher: Gemini enrichment → Firebase (deep merge, normalization, change detection)
- [x] DeepResearcher: Gemini deep analysis → evidence-based deterministic scoring → Firebase
- [x] Shared merge utilities extracted to `services/merge.js`
- [x] Canonical protocol schema via `normalizeProtocol()` — 4 deep research fields included
- [x] `GET /protocols` and `GET /protocols/:id` — normalized responses
- [x] `POST /flash-research` — triggers FlashResearcher (auto-fires DeepResearcher)
- [x] `POST /deep-research/:protocolId` — manual DeepResearcher trigger
- [x] Firebase Realtime Database abstraction
- [x] Seed script pulls from Monad testnet registry CSV
- [x] 226 protocols seeded with full schema including deep research fields

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
- [ ] DeepResearcher integration — show "Analyzing..." state when status is `running`, poll every 15s, auto-refresh on `completed`
- [ ] Wire real wallet connect via Privy end-to-end
- [ ] Wire real contract calls for `stake()` from the commit modal

## Phase 5 — Integration + End-to-End Test

- [ ] Full flow test: search → FlashResearcher enriches → DeepResearcher scores → protocol page updates
- [ ] Test DeepResearcher concurrency: search same protocol twice simultaneously, verify only one runs
- [ ] Test DeepResearcher failure: search nonsense → verify `failed` state + error message stored
- [ ] Test the FAIL path: commit, don't engage, confirm slash logic triggers
- [ ] Test with a fresh wallet with zero prior history
- [ ] Fix broken states, loading states, error states — no blank screens
- [ ] Test normalization: search brand-new protocol → verify full schema in Firebase

## Phase 6 — Polish + Submission Assets

- [ ] Finalize README (problem, solution, stack, links)
- [ ] Record demo video (under 3 min): search → Flash → Deep → commit → stake → verify
- [ ] Write submission form answers (Description, Problem, Solution)
- [ ] Push final commits with clear messages
- [ ] Post about it on X, grab the post URL for submission
- [ ] Double check: contract address included, testnet labeled, project URL live
- [ ] Full run-through as a stranger — open cold, try the flow, time under 3 minutes

---

## Current status snapshot

**Done:** Phase 0 (architecture), Phase 1 (contract), Phase 2 (FlashResearcher + DeepResearcher + normalization), Phase 3&4 (frontend mostly built)

**Schema (canonical):** id, name, image, chain, network, category, subcategory, plain_summary, summary, who_its_for, who_its_not_for, deployed_date, age_summary, team_as_of, score, score_max, contract_verified, links{}, risks{}, forensics{}, funding{}, founder_history[], contracts[], use_cases[], team[], restricted_jurisdictions[], deep_research_status, deep_researched_at, deep_research_error, deep_research_version, created_at, created_by_wallet

**Seeded:** 226 protocols, all with `deep_research_status: "pending"`

**Next up:** Phase 4 frontend (DeepResearcher UI integration — polling + "Analyzing..." state), then Phase 5 e2e testing, then Phase 6 polish.
