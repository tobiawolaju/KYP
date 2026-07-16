# KYP — Build Plan / Checklist

Goal: win a Winner slot ($500 x3). Judged on elegance + execution, checked live by a judging agent for placeholder data, fake commits, and vaporware.

Scope discipline rule: if a step isn't done by its deadline, cut it — don't let it bleed into the next phase. A smaller thing that works beats a bigger thing that's broken on demo day.

---

## Phase 0 — Architecture (tonight, ~45 min) ✅ DONE

Full details in [`ARCHITECTURE.md`](./ARCHITECTURE.md) — data models, flow diagram, sequence diagram, component map.

- [x] Define the exact data model for a "protocol research" record (name, links, score, use cases, risks, summary) → see `ARCHITECTURE.md`
- [x] Define the exact data model for a "commitment" (user wallet, protocol, staked amount, commit timestamp, verify condition, status: active/verified/slashed) → see `ARCHITECTURE.md`
- [x] Decide the single onchain "did they actually engage" check → any tx from `user_wallet` to `protocol_contract_address` where `tx.timestamp > commit_timestamp`, checked via RPC and triggered by backend (not a trustless oracle — right tradeoff for the timeline)
- [x] Sketch the 3 screens you actually need: (1) Research input + profile view, (2) Action/commit flow, (3) Dashboard of active commitments + status
- [x] Write down what you are explicitly NOT building tonight → Google Calendar integration, multi-agent research pipeline, commitment-conflict checking, sybil/duplicate-wallet protection, slashed-stake payout logic, KYD lookup extension — all parked as roadmap bullets

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

## Phase 2 — Backend (in progress)

- [ ] Set up Node.js server skeleton on Render
- [ ] Build `/research` endpoint: takes a link/handle, returns structured profile (name, description, score, use cases, risks) — start with a single well-crafted prompt to an LLM with web access rather than multiple chained agents
- [ ] Build `/commit` endpoint: writes commitment record, triggers/records the onchain stake tx
- [ ] Build `/verify` endpoint: reads onchain activity for a wallet + protocol pair, updates commitment status
- [ ] **Build scheduled auto-resolution script**: periodic job (Render Cron Job, or an external scheduler hitting a `/resolve-due-commitments` endpoint) that scans all `active` commitments, checks each via RPC, and calls `verify()` or `slash()` on the ones that are due — no manual button click required, resolves automatically the moment a deadline passes or engagement is detected. Confirm Render plan supports Cron Jobs before committing to that path; fall back to an external trigger (cron-job.org / GitHub Actions scheduled workflow) if not.
- [ ] Add basic error handling (bad link, LLM failure, RPC failure) — no unhandled crashes during a live demo

## Phase 3 & 4 — Frontend (well ahead of plan, built on dummy data)

Stack note: frontend is Svelte + Vite (not React as originally assumed) — routing, structure, and all prompts adjusted accordingly.

Visual identity locked: Monad-brand-inspired white theme (`#6E54FF` primary purple, `#DDD7FE` light fill, `#85E6FF`/`#B9E3F9`/`#FF8EE4`/`#FFAE45` secondary accents, red/rose for slashed state), Britti Sans/Inter/Roboto Mono typography, Privy for wallet auth (wallet-only, embedded wallets disabled).

- [x] Visual identity picked and applied consistently (not default Tailwind/shadcn look)
- [x] Routing set up: `/`, `/protocol/:id`, `/protocols` (explore), `/dashboard`, `/dashboard/commit/:id`
- [x] Dummy data file with 8 protocols, commitments, favorites, activity events
- [x] Home — hero + featured protocols grid
- [x] Protocol page — score shield (5-tier: Rug potential/High risk/Caution/Solid/Secured), who it's for / who it's NOT for, risks, verification badge, age fact, team section, use cases, links, favorite toggle, similar protocols with tier tags, commit modal
- [x] Explore (`/protocols`) — filter by network, category, score range (TVL filter deliberately excluded — no real data source yet)
- [x] Dashboard — wallet address, total staked, streak calculation, aggregate GitHub-style activity grid (merged across protocols), per-protocol commit graphs (real timeline with empty-day cells, not floating dots), FAB for "+ Research new protocol", wallet disconnect
- [x] Commit Detail page — expanded commit graph + activity list + stake balance
- [x] CommitGraph component — reusable, mini/expanded sizes, cyan/red/muted day-cell timeline logic
- [x] Static "Testnet" network badge (no live mainnet toggle — correctly scoped, `network` field ready for future use)
- [x] Commit/stake modal copy updated: fixed 72h period stated explicitly, auto-resolution explained (no manual verify button implied)
- [ ] Wire real wallet connect via Privy end-to-end (currently scaffolded — confirm live connect/disconnect works, not just UI states)
- [ ] Replace dummy data reads with real backend calls once Phase 2 endpoints are live (`/research`, `/commit`, `/verify`)
- [ ] Wire real contract calls for `stake()` from the commit modal (currently navigates to dashboard without a real tx)

## Phase 5 — Integration + End-to-End Test

- [ ] Full flow test: paste a real protocol link → get profile → commit → stake tx confirms onchain → simulate engagement tx → verify updates status
- [ ] Test the FAIL path too: commit, don't engage, confirm slash logic actually triggers (judges may test this)
- [ ] Test with a fresh wallet with zero prior history — make sure app doesn't break on empty state
- [ ] Fix broken states, loading states, error states — no blank screens

## Phase 6 — Polish + Submission Assets

- [ ] Finalize README (problem, solution, stack, links) — already drafted, fill in final links
- [ ] Record demo video (under 3 min): show research → commit → stake → verify, live, no cuts hiding fake data
- [ ] Write submission form answers (Description, Problem, Solution) — reuse README language, keep tight
- [ ] Push final commits with clear messages (avoid "final final v2" — judging agent checks commit history)
- [ ] Post about it on X, grab the post URL for submission
- [ ] Double check: contract address included, testnet clearly labeled, project URL live and working
- [ ] Do a full run-through as a stranger would — open the link cold, try the flow, time yourself under 3 minutes

---

## Tonight's realistic target

Given the clock, aim to close out **Phase 0 and Phase 1** tonight (architecture + contract deployed and tested). That's the part everything else depends on, and it's the least risky to do late at night when you're more likely to make sloppy frontend/UI calls. Fresh eyes tomorrow for UI design and the research agent prompt.
