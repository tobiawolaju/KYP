# KYP — Know Your Protocol

**Research it. Act on it. Prove you did.**

Built for the BuildAnything "Spark" hackathon on Monad.

---

## The Problem

DYOR is broken. You can check Google, X, YouTube — but it's easy to pick up fake or outdated information, and there's no way to know if a protocol that's safe today stays safe next month.

Then there's the follow-through problem: you're genuinely interested in 8–10 protocols, but you can't keep up with all of them — and you don't want a nagging app asking if you're keeping up.

## The Solution

KYP runs an AI-powered background check most people don't know how to do themselves, and gives you a clear answer: is this protocol relevant to you, is it safe now, and what are the odds it stays safe?

Then it solves the follow-through problem too. Commit with a MON stake, and KYP checks your public wallet automatically — no forms, no check-ins, no nagging. Follow through, get your stake back. Don't, and it's forfeited. Your wallet proves it, not your word.

KYP turns lurkers into stakeholders.

## How It Works

### 1. Research
Paste anything you have on a protocol — a link, an X handle, a Discord invite, whatever. An AI agent runs a real background check: team background, links, latest news, onchain forensics, and community signal. This compiles into a single-page profile with:
- A 0–50 score, broken into five tiers (Rug potential → Secured)
- _Note: scores display as X.X/5 in the UI (e.g. 4.2) for readability — this is a deliberate scaling of the underlying 0–50 research score, not a bug._
- Who the protocol is for — **and who it's not for**
- Clear use cases
- Risks flagged from contract, community, and structural signals
- Onchain forensics: admin/mint/pause functions, deployer wallet history, holder concentration — the kind of checks most people don't know how to run themselves
- Current known team, protocol age, and contract verification status

### 2. Commit
Decide to actually engage. Stake MON to back your intention — starting small, on Monad Testnet.

### 3. Verify — the 3-strike system
Once you commit, KYP checks your **public wallet** for real onchain engagement with the protocol automatically, every 72 hours, for up to three check-ins (9 days total):

- **Engage at any point** → your stake is returned immediately, no waiting out the full window
- **Miss a check-in** → logged as a strike, no penalty yet
- **Want to walk away early, in good standing?** You can withdraw your stake at any time, as long as you haven't missed more than one check-in
- **Miss 3 check-ins in a row** → your stake is forfeited

No self-reporting, anywhere in this loop. The check is a real RPC read against your wallet's transaction history, and the resolution — returning or forfeiting your stake — happens automatically via a scheduled backend job, not a button you have to remember to click.

## Why Onchain

The stake and the verification both live onchain by necessity — the entire point is replacing "trust me, I did it" with something checkable. A self-reported todo app doesn't solve the problem; a wallet that has to prove itself does.

## Design

Visual identity — colors and typography — is inspired by Monad's official brand kit (no logo/trademark use, style reference only). Deep purple primary (`#6E54FF`) on a clean white theme, Britti Sans headlines, Inter body text, Roboto Mono for addresses, scores, and stake amounts.

## Tech Stack

- **Frontend:** Svelte + Vite, deployed on Vercel
- **Backend:** Node.js, deployed on Render — scheduled commitment-check worker (Render Cron Job or external trigger), Google Sheets + Apps Script for lightweight event logging
- **Research agent:** Gemini (Google AI Studio, grounded with live web search) for protocol research and onchain forensics — chosen specifically because grounded search reduces hallucinated/fabricated results, which matters when the output is a safety assessment
- **Auth / Wallet:** Privy — wallet-connect only, embedded wallets disabled by design (this app only works with a user's own existing wallet)
- **Smart contracts:** Solidity, deployed on Monad Testnet

## Deployed Contracts (Monad Testnet)

### `KYPCommitment` — Official Submission (216h window, 3-strike model)
- File: `Contract/src/KYPCommitment.sol`
- Address: `0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf`
- Explorer: https://testnet.monadvision.com/address/0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf
- The current contract used in the KYP protocol. 216-hour verify window with 3-strike verification model.

### `KYPCommitment` — Previous Deployment (superseded)
- Address: `0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0`
- Explorer: https://testnet.monadvision.com/address/0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0
- Original deployment with 72-hour verify window. Replaced by the 216h/3-strike deployment above. Kept for transparency and audit trail.

### `KYPCommitmentDemo` — Demo Only
- File: `contract/src/KYPCommitmentDemo.sol`
- Address: `0x98c3e4594ecfa1c45e8056932652b04cdea64e5d`
- Explorer: https://testnet.monadvision.com/address/0x98c3e4594ecfa1c45e8056932652b04cdea64e5d
- Identical logic to `KYPCommitment` but with a short verify window so the full check-in/slash path can be exercised live for the demo video. **Not part of the actual submission.**

## Verified Test Results — Heartbeat Worker (Compressed Timeline)

All 4 worker paths verified against `KYPCommitmentDemo` (15-min window, 3 checks at 5-min intervals). Tests use timestamp-shifting to simulate time progression, with real on-chain staking and verify/slash calls.

**Contract:** `0x98c3e4594ecfa1c45e8056932652b04cdea64e5d` (KYPCommitmentDemo)
**Test method:** `POST /worker/tick` (heartbeat-driven), timestamp-shifting for DB state, `runWorkerTick()` called directly
**Date:** 2026-07-19

| Path | Scenario | Result | On-Chain TX |
|------|----------|--------|-------------|
| A | Stake → engage → worker finds engagement → verify | **PASS** | `0x57e9e6d7...` |
| B | No engagement → 3 misses → worker decides slash | **PASS** | Reverted (real deadline not yet passed — expected in compressed test; worker _decision_ is correct) |
| C | 1 miss → user withdraws early → stake returned | **PASS** | `0xaf987f4e...` |
| D | Deadline passes → worker decides slash (0 misses) | **PASS** | Reverted (real deadline not yet passed — expected in compressed test; worker _decision_ is correct) |

**4/4 paths passed.** Paths B and D correctly identify the slash decision; the on-chain revert is expected because the real on-chain deadline (`block.timestamp + 15 min`) hasn't elapsed yet while the DB timestamp has been shifted forward. The worker's decision logic is verified.

Test harness: `Backend/tests/demo-test-fast.js`

## Running the Demo Test Locally

The compressed-timeline test uses `KYPCommitmentDemo` (15-min window) instead of the production contract. To run it:

1. **Start the backend with demo intervals:**
   ```
   cd Backend
   WORKER_CHECK_INTERVAL_MS=300000 \
   WORKER_SNAPSHOT_INTERVAL_MS=300000 \
   WORKER_MIN_INTERVAL_MS=10000 \
   KYP_CONTRACT_ADDRESS=0x98c3e4594ecfa1c45e8056932652b04cdea64e5d \
   node src/server.js
   ```

2. **Run the test harness** (in a separate terminal):
   ```
   cd Backend
   node tests/demo-test-fast.js
   ```

3. **Reset to production** when done — remove the env overrides or restart without them. The defaults are:
   - `KYP_CONTRACT_ADDRESS=0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf`
   - `WORKER_CHECK_INTERVAL_MS=259200000` (72h)
   - `WORKER_MIN_INTERVAL_MS=300000` (5min throttle)

## Roadmap (explicitly not built for this hackathon)

- Google Calendar integration for commitment reminders
- Mainnet support (architecture already supports it — `network` is a real field, not hardcoded logic; requires real MON for gas and a fresh audit-style review before real funds are at risk)
- KYD — reputation lookup by wallet address, for hiring/reward use cases, reusing the same onchain analysis engine
- Multi-chain support beyond Monad

## Status

Built solo, in public, during the Spark hackathon window (Jul 13–19, 2026).

## Links

- Live app: https://knowyourprotocol.vercel.app/
- Demo video: _[add on ship]_
- GitHub: https://github.com/tobiawolaju/KYP
