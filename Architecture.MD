# KYP — Architecture

## Data Models

### Protocol Research Record

```json
{
  "id": "uuid",
  "input_raw": "whatever the user pasted (link/handle/text)",
  "name": "string",
  "chain": "monad",
  "network": "mainnet | testnet | unknown",
  "links": {
    "project": "url | null",
    "twitter": "url | null",
    "discord": "url | null",
    "github": "url | null"
  },
  "contract_address": "string | null",
  "contract_verified": "boolean | null",
  "score": 0,
  "score_max": 50,
  "who_its_for": "1-2 sentence string",
  "who_its_not_for": "1-2 sentence string | null",
  "use_cases": ["string", "string"],
  "risks": {
    "contract": "string | null",
    "community": "string | null",
    "structural": "string | null"
  },
  "team": "string | null",
  "team_as_of": "timestamp | null",
  "deployed_date": "timestamp | null",
  "age_summary": "string | null",
  "summary": "2-3 sentence string",
  "created_at": "timestamp",
  "created_by_wallet": "string"
}
```

`chain` is hardcoded to `"monad"` for this build — you're not building a multi-chain research tool tonight, but the field existing now means you don't have to do a schema migration later if KYP ever expands. `network` (mainnet/testnet) stays a separate field because a protocol's research profile doesn't change based on which environment its contract is deployed to.

### Commitment Record

```json
{
  "id": "uuid",
  "user_wallet": "string",
  "chain": "monad",
  "network": "testnet",
  "protocol_id": "uuid (fk -> research record)",
  "protocol_contract_address": "string",
  "staked_amount": "string (wei)",
  "stake_tx_hash": "string",
  "commit_timestamp": "timestamp",
  "verify_deadline": "timestamp (commit_timestamp + 216h / 9 days)",
  "status": "active | verified | slashed | withdrawn",
  "verify_tx_hash": "string | null",
  "verified_at": "timestamp | null",
  "missed_count": "number (0-3)",
  "last_check_at": "timestamp | null"
}
```

`verify_deadline` is now 216 hours (9 days) — the contract's `VERIFY_WINDOW`. The backend performs up to 3 verification checks at 72h intervals (check 1 at 72h, check 2 at 144h, check 3 at 216h). `missed_count` tracks how many checks failed to find onchain engagement. After 3 misses the commitment is slashed. `status` includes `"withdrawn"` for DB-only records where the user has initiated an onchain withdrawal via `POST /withdraw`.

`network` is hardcoded `"testnet"` for the hackathon build but present as a real field, not baked into logic, so switching to mainnet later is a config change, not a rewrite.

### Favourites Record

```json
{
  "user_wallet": "string",
  "protocol_id": "uuid (fk -> research record)",
  "favourited_at": "timestamp",
  "auto_favourited": "boolean"
}
```

`auto_favourited` tracks whether the favourite was added manually by the user or automatically (e.g. after committing to a protocol). This lets the UI distinguish bookmarked-from-research from committed-to protocols without a separate query.

---

## System Flow — Research → Commit → Dashboard

```mermaid
flowchart TD
    A[User pastes link/handle] --> B[Frontend: Research screen]
    B --> C[POST /research]
    C --> D[Backend: Research Agent<br/>LLM + web lookup]
    D --> E[(Research Record<br/>stored in DB)]
    E --> F[Profile Card rendered:<br/>score, use cases, risks, who it's for]
    F --> G{User clicks Commit?}
    G -- No --> H[End: profile saved,<br/>viewable later]
    G -- Yes --> I[Frontend: Commit screen<br/>stake amount input]
    I --> J[Wallet prompts stake tx]
    J --> K[Smart Contract:<br/>stake&#40;protocolAddress&#41;]
    K --> L[POST /commit<br/>records tx hash]
    L --> M[(Commitment Record<br/>status: active, missed_count: 0)]
    M --> N[Dashboard: shows commitment<br/>with countdown to deadline]
    N --> O[Scheduled job &#40;cron&#41;:<br/>scans active commitments<br/>at 72h / 144h / 216h intervals]
    O --> P{Onchain check:<br/>tx from user_wallet to<br/>protocol_contract_address<br/>after commit_timestamp?}
    P -- Yes, before 216h deadline --> Q[Contract: verify&#40;&#41;<br/>stake returned]
    P -- No, at check interval --> R[Increment missed_count<br/>Check again at next interval]
    R --> S{missed_count == 3?}
    S -- No --> N
    S -- Yes --> T[Contract: slash&#40;&#41;<br/>stake forfeited]
    Q --> U[(status: verified)]
    T --> V[(status: slashed)]
    U --> N
    V --> N
```

---

## Sequence — Commit + Verify (the part judges will actually click through)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant C as Smart Contract
    participant RPC as Monad RPC
    participant Sched as Scheduler

    U->>F: Click "Commit" on profile card
    F->>U: Show stake input
    U->>F: Confirm stake amount
    F->>C: stake(protocolAddress) [payable tx]
    C-->>F: tx hash
    F->>B: POST /commit {wallet, protocol_id, tx_hash}
    B-->>F: Commitment record created (status: active, missed_count: 0)
    F->>U: Redirect to Dashboard

    Note over U,RPC: User goes and actually interacts<br/>with the protocol in the real world

    loop 3 checks at 72h intervals (72h, 144h, 216h)
        Sched->>B: Cron trigger: scan active commitments<br/>at current check interval
        B->>RPC: Query txs from user_wallet to protocol_contract_address<br/>after commit_timestamp
        RPC-->>B: tx found / not found
        alt Engagement found, before 216h deadline
            B->>C: verify(commitmentId)
            C-->>B: stake returned to user
            B-->>F: status: verified
        else No engagement at this check
            B->>B: Increment missed_count
            alt missed_count == 3 (final check)
                B->>C: slash(commitmentId)
                C-->>B: stake forfeited
                B-->>F: status: slashed
            else missed_count < 3
                B-->>F: still active, waiting for next check
            end
        end
    end
    F->>U: Dashboard updates status badge
```

---

## Component Map

| Layer | Responsibility | Talks to |
|---|---|---|
| Frontend (Vercel) | Research input, profile card, commit flow, dashboard | Backend API, wallet (via Privy SDK), Monad RPC (read-only for balance/tx display) |
| Backend (Render) | `/research`, `/commit`, `/verify`, `/withdraw` endpoints; orchestrates LLM calls and RPC checks; scheduled cron for 3-strike verification loop | LLM provider, Monad RPC, Privy (wallet-only auth), DB |
| Smart Contract (Monad Testnet) | `stake()`, `verify()`, `slash()` — holds funds, enforces state transitions | Called by backend (or directly by frontend wallet for `stake()`) |
| DB (research + commitment records) | Persists profiles and commitments | Backend only |

## Contracts

KYP uses a dual-contract setup:

- **`KYPCommitment`** — the official submission contract with a 216-hour (9-day) verify window (`0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf`). Deployed once and used by all real commitments. Backend performs 3 verification checks at 72h intervals.
- **`KYPCommitmentDemo`** — an identical twin with a 15-minute verify window (`0x98c3e4594ecfa1c45e8056932652b04cdea64e5d`). Exists solely for capturing slash-path footage in the demo video. Backend performs 3 checks at 5-minute intervals. Not part of the actual submission.

Both contracts share the same ABI surface (`stake` / `verify` / `slash` / `withdrawForfeited`). The demo contract's shortened window makes it possible to show a full stake → wait → slash cycle without waiting 72 hours.

## Explore / Protocols Route

The app exposes a `/protocols` route — an explorable directory of all researched protocols. Supports the following query filters:

| Parameter | Values | Behaviour |
|---|---|---|
| `network` | `mainnet`, `testnet`, `unknown` | Filter by deployment environment |
| `category` | `lending`, `dex`, `infra`, `gaming`, etc. | Filter by use-case category |
| `score_min` | 0–50 | Lower bound of score range |
| `score_max` | 0–50 | Upper bound of score range |

There is intentionally **no TVL filter** — there is no reliable real-time TVL data source wired in yet, so including the filter would either be perpetually empty or misleading. It is explicitly parked as a future addition.

**One architectural decision to make explicitly:** does `verify()`/`slash()` get called by your backend (a trusted server wallet with permission to call these functions), or does the user call `verify()` themselves and the contract does the RPC check onchain via an oracle? For a 4-day build, **backend-triggered verify/slash is the right call** — a fully trustless onchain oracle is a rabbit hole you don't have time for, and "backend checks RPC, then calls the contract" is still a real, checkable onchain verification from the judge's perspective, not a self-report.
