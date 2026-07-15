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
- [ ] Set up Foundry project locally (`forge init`), drop in `KYPCommitment.sol` under `src/` and `KYPCommitment.t.sol` under `test/`
- [ ] Run `forge test -vv` — all 9 tests should pass before deploying anywhere
- [ ] Generate a verifier wallet (separate from your deployer wallet) — this is the backend's signing key, keep its private key server-side only
- [ ] Deploy to Monad Testnet: `forge create src/KYPCommitment.sol:KYPCommitment --constructor-args <VERIFIER_ADDRESS> --rpc-url <MONAD_TESTNET_RPC> --private-key <DEPLOYER_KEY>`
- [ ] Verify contract on the Monad explorer (per the "How to verify a smart contract" guide in hackathon resources)
- [ ] Test manually on testnet with 2–3 real transactions (stake, verify pass, verify fail → slash, owner withdraw) — confirms the deployed bytecode behaves like the local test suite
- [ ] Save contract address + ABI (from Foundry's `out/KYPCommitment.sol/KYPCommitment.json`) somewhere both frontend and backend can reference — e.g. a shared `contracts/` folder or a small npm package

## Phase 2 — Backend (tonight/tomorrow AM)

- [ ] Set up Node.js server skeleton on Render
- [ ] Build `/research` endpoint: takes a link/handle, returns structured profile (name, description, score, use cases, risks) — start with a single well-crafted prompt to an LLM with web access rather than multiple chained agents
- [ ] Build `/commit` endpoint: writes commitment record, triggers/records the onchain stake tx
- [ ] Build `/verify` endpoint: reads onchain activity for a wallet + protocol pair, updates commitment status
- [ ] Add basic error handling (bad link, LLM failure, RPC failure) — no unhandled crashes during a live demo

## Phase 3 — Frontend UI Design (tomorrow)

- [ ] Pick a visual identity — NOT default Tailwind/shadcn look (judging agent flags generic AI-slop UI). Pick one distinct color/type choice and commit to it everywhere.
- [ ] Design Screen 1: research input (paste box) → profile card output (score, use cases, risks, "who this is for")
- [ ] Design Screen 2: action steps + commit button + stake amount input
- [ ] Design Screen 3: dashboard — list of commitments with live status (active / verified / slashed)
- [ ] Make sure everything fits in viewport, no dead space, no obvious template scaffolding left in

## Phase 4 — Frontend Build

- [ ] Scaffold React app, deploy skeleton to Vercel early (get the empty shell live first — avoids last-minute deploy surprises)
- [ ] Build research input + profile view, wire to `/research`
- [ ] Build commit flow, wire to `/commit` + wallet connect (wagmi/viem or similar) + contract stake call
- [ ] Build dashboard, wire to `/verify` + commitment list endpoint
- [ ] Wallet connect flow (Monad Testnet, testnet MON from faucet for demo wallet)

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
