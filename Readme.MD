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
Paste anything you have on a protocol — a link, an X handle, a Discord invite, whatever. A two-agent AI pipeline runs a real background check:

- **FlashResearcher** (< 5s): Enriches protocol data — links, contracts, forensics, founder history, logo
- **DeepResearcher** (background): Deep analysis — risks, funding, scoring from 8 weighted evidence signals

This compiles into a single-page profile with:
- A 0–50 score, broken into five tiers (Rug potential → Secured)
- _Note: scores display as X.X/5 in the UI (e.g. 4.2) for readability — this is a deliberate scaling of the underlying 0–50 research score._
- Who the protocol is for — **and who it's not for**
- Clear use cases
- Risks flagged from contract, community, and structural signals
- Onchain forensics: admin/mint/pause functions, deployer wallet history, holder concentration
- Current known team, protocol age, and contract verification status

### 2. Commit
Decide to actually engage. Stake MON to back your intention — on Monad Testnet or Monad Mainnet (toggle in the navbar).

### 3. Verify — the 3-strike system
Once you commit, KYP checks your **public wallet** for real onchain engagement with the protocol automatically, every 72 hours, for up to three check-ins (9 days total):

- **Engage at any point** → your stake is returned immediately, no waiting out the full window
- **Miss a check-in** → logged as a strike, no penalty yet
- **Want to walk away early, in good standing?** → withdraw your stake at any time (as long as you haven't missed more than one check-in)
- **Miss 3 check-ins in a row** → your stake is forfeited

No self-reporting, anywhere in this loop. The check is a protocol-agnostic RPC read against your wallet's on-chain event history — not a specific event signature, any interaction counts. Resolution happens automatically via a heartbeat-triggered backend worker, not a button you have to remember to click.

## Architecture Highlights

### Protocol-Agnostic Engagement Detection
KYP doesn't depend on specific event signatures to detect engagement. It queries all on-chain events where your wallet address appears (`getLogs` with user address as indexed topic), then filters by the target protocol's contract address. Works with any protocol — DEX swaps, lending, governance, anything.

### Zero-Budget Worker (Frontend Heartbeat)
No paid Render Background Worker. The frontend pings `POST /worker/tick` every 30 seconds (visibility-aware, auth-gated). In-memory lock guard prevents concurrent runs. 5-minute throttle between actual executions.

### Multi-Network from Day One
Both Testnet and Mainnet supported via a segmented toggle in the navbar. Protocol records are network-scoped (separate DB entries with different contract addresses). The worker routes RPC calls to the correct chain per-commitment. One worker handles both networks.

### Two-Agent Research Pipeline
FlashResearcher gives instant results (< 5s). DeepResearcher runs in the background with deterministic scoring from 8 evidence signals. Shared merge utilities prevent data loss. Progressive enhancement — the app works with just Flash.

### Adaptive Block Estimation
Instead of assuming a fixed 2-second block time (which silently breaks on faster/slower chains), KYP fetches real chain data and calculates the actual average block time for accurate block range estimation.

## Why Onchain

The stake and the verification both live onchain by necessity — the entire point is replacing "trust me, I did it" with something checkable. A self-reported todo app doesn't solve the problem; a wallet that has to prove itself does.

## Design

Visual identity — colors and typography — is inspired by Monad's official brand kit (no logo/trademark use, style reference only). Deep purple primary (`#6E54FF`) on a clean white theme, Britti Sans headlines, Inter body text, Roboto Mono for addresses, scores, and stake amounts. Dark mode fully supported (segmented pill toggle in navbar).

## Tech Stack

- **Frontend:** Svelte 5 + Vite, deployed on Vercel
- **Backend:** Node.js/Express, deployed on Render — heartbeat-triggered commitment-check worker, two-agent AI research pipeline
- **Research agent:** Gemini (Google AI Studio, grounded with live web search) — chosen because grounded search reduces hallucinated results, which matters when the output is a safety assessment
- **Auth / Wallet:** Privy — wallet-connect only, embedded wallets disabled (this app only works with a user's own existing wallet)
- **Smart contracts:** Solidity, deployed on Monad Testnet + Mainnet
- **Database:** Firebase Realtime Database (protocols, commitments, favourites, activity events)
- **On-chain interaction:** viem (frontend wallet), ethers (backend contract calls)

## Deployed Contracts

### `KYPCommitment` — Production (216h window, 3-strike model)

| Network | Address | Chain ID | Explorer |
|---|---|---|---|
| **Testnet** | `0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf` | 10143 | [View](https://testnet.monadvision.com/address/0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf) |
| **Mainnet** | `0x8bf8348963c366d9ba210ddc8574caa7522335f8` | 143 | [View](https://testnet.monadvision.com/address/0x8bf8348963c366d9ba210ddc8574caa7522335f8) |

Same Solidity source, same ABI, same verifier address (`0x37674EE795f126BC933Dc57439eb194889dA0d0E`). Frontend includes a Testnet/Mainnet toggle — switching changes the viem chain, contract address, and backend RPC routing.

### `KYPCommitmentDemo` — Demo Only
- Address: `0x98c3e4594ecfa1c45e8056932652b04cdea64e5d`
- [Explorer](https://testnet.monadvision.com/address/0x98c3e4594ecfa1c45e8056932652b04cdea64e5d)
- 15-minute verify window for capturing the full slash path in the demo video. **Not part of the actual submission.**

## Verified Test Results — Heartbeat Worker

All 4 worker paths verified against `KYPCommitmentDemo` (15-min window, 3 checks at 5-min intervals). Tests use timestamp-shifting to simulate time progression, with real on-chain staking and verify/slash calls.

| Path | Scenario | Result | On-Chain TX |
|------|----------|--------|-------------|
| A | Stake → engage → worker finds engagement → verify | **PASS** | `0x57e9e6d7...` |
| B | No engagement → 3 misses → worker decides slash | **PASS** | Reverted (real deadline not yet passed — expected; worker _decision_ is correct) |
| C | 1 miss → user withdraws early → stake returned | **PASS** | `0xaf987f4e...` |
| D | Deadline passes → worker decides slash (0 misses) | **PASS** | Reverted (real deadline not yet passed — expected; worker _decision_ is correct) |

**4/4 paths passed.** Paths B and D on-chain reverts are expected because the real on-chain deadline hasn't elapsed while the DB timestamp has been shifted. The worker's decision logic is verified.

Test harness: `Backend/tests/demo-test-fast.js`

## Running the Demo Test Locally

The compressed-timeline test uses `KYPCommitmentDemo` (15-min window) instead of the production contract.

```bash
# Terminal 1: Start backend with demo intervals
cd Backend
WORKER_CHECK_INTERVAL_MS=300000 \
WORKER_SNAPSHOT_INTERVAL_MS=300000 \
WORKER_MIN_INTERVAL_MS=10000 \
KYP_CONTRACT_ADDRESS=0x98c3e4594ecfa1c45e8056932652b04cdea64e5d \
node src/server.js

# Terminal 2: Run test harness
cd Backend
node tests/demo-test-fast.js
```

Production defaults: `KYP_CONTRACT_ADDRESS=0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf`, `WORKER_CHECK_INTERVAL_MS=259200000` (72h), `WORKER_MIN_INTERVAL_MS=300000` (5min).

## Firebase Data Paths

| Path | Purpose |
|---|---|
| `/protocols` | Protocol research records (network-scoped IDs: `kuru-testnet`, `kuru-mainnet`) |
| `/commitments` | Stake + verification records (network field routes to correct chain) |
| `/favorites` | User bookmarks (network-scoped protocol_id) |
| `/activity_events` | Daily engagement snapshots from worker |

## Roadmap (not built for this hackathon)

- Google Calendar integration for commitment reminders
- KYD — reputation lookup by wallet address, reusing the same onchain analysis engine
- Multi-chain support beyond Monad
- Trustless on-chain oracle (backend-triggered verify/slash is the right call for a hackathon build)

## Status

Built solo, in public, during the Spark hackathon window (Jul 13–19, 2026).

## Links

- Live app: https://knowyourprotocol.vercel.app/
- Demo video: _[add on ship]_
- GitHub: https://github.com/tobiawolaju/KYP
