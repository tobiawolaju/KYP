# KYP Backend

Node.js/Express server for the KYP protocol — handles research, commitments, and verification orchestration.

## Run Locally

```bash
npm install
npm run dev     # starts with nodemon on :3001
```

The server loads environment from a `.env` file (see `.env.example` for required vars).

## Routes

### POST /research

Accept raw input about a protocol and return a structured research record.

**Request:**
```json
{
  "input_raw": "https://example-protocol.xyz"
}
```

**Response (200):** [`Protocol Research Record`](../Architecture.MD) schema — hardcoded stub for now.

---

### POST /commit

Record a user's onchain stake commitment.

**Request:**
```json
{
  "user_wallet": "0x...",
  "protocol_id": "uuid",
  "protocol_contract_address": "0x...",
  "staked_amount": "10000000000000000",
  "stake_tx_hash": "0x..."
}
```

**Response (201):** [`Commitment Record`](../Architecture.MD) with `status: "active"`.

---

### GET /verify

Check whether a commitment's onchain activity was confirmed before the deadline.

**Query:**
```
?commitment_id=660e8400-e29b-41d4-a716-446655440001
```

**Response (200):**
```json
{
  "id": "commitment_id",
  "status": "verified" | "slashed",
  "verify_tx_hash": "0x...",
  "verified_at": "timestamp",
  "verify_deadline": "timestamp",
  "message": "..."
}
```
