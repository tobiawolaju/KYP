#!/usr/bin/env node
/**
 * KYPCommitmentDemo — Compressed-Timeline Test Harness
 *
 * Tests all 4 worker paths against the 15-min demo contract:
 *   Path A: Stake → engage → worker finds engagement → verify (stake returned)
 *   Path B: Stake → no engagement → 3 missed checks → slash (stake forfeited)
 *   Path C: Stake → no engagement → 1 miss → user withdraws early (stake returned)
 *   Path D: Stake → no engagement → deadline passes → worker slashes
 *
 * All worker interactions go through POST /worker/tick (heartbeat-driven path).
 * Intervals: checks every 5 min, demo window 15 min (3 checks before deadline).
 */

import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// ── Config ──────────────────────────────────────────────────────────────
const RPC_URL = "https://testnet-rpc.monad.xyz";
const DEMO_CONTRACT = "0x98c3e4594ecfa1c45e8056932652b04cdea64e5d";
const DEMOVerifier = "0x37674EE795f126BC933Dc57439eb194889dA0d0E";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const WORKER_TICK_URL = `${BACKEND_URL}/worker/tick`;

// Deployer wallet (funds test wallet, same as demo contract deployer / verifier)
const DEPLOYER_PRIVATE_KEY =
  "0x8293fc60d7e3a380951a8c4a77fd4b705c6d3234a9b3de8a307953192459526b";

// Test wallet — freshly generated, no prior history
const TEST_PRIVATE_KEY =
  "0xc61615a8680c4cc2f7e98ac057ee5e28854c4cb7ff004524a7ba95caef315371";

// Same ABI for both KYPCommitment and KYPCommitmentDemo
const ABI = require("../../Backend/abi/KYPCommitment.json");

// ── Providers & Wallets ─────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(RPC_URL);
const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
const testWallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);

const demoAsDeployer = new ethers.Contract(DEMO_CONTRACT, ABI, deployerWallet);
const demoAsTest = new ethers.Contract(DEMO_CONTRACT, ABI, testWallet);

const STAKE_AMOUNT = ethers.parseEther("0.01");
const DEADLINE_MS = 15 * 60 * 1000; // 15 minutes
const CHECK_INTERVAL_MS = Number(process.env.WORKER_CHECK_INTERVAL_MS) || 5 * 60 * 1000;
const THROTTLE_MS = Number(process.env.WORKER_MIN_INTERVAL_MS) || 5 * 60 * 1000;

// ── Helpers ─────────────────────────────────────────────────────────────
function ts() {
  return new Date().toISOString().slice(11, 23);
}
function log(msg) {
  console.log(`[${ts()}] ${msg}`);
}

async function fundTestWallet() {
  log("Funding test wallet with 1 MON...");
  const tx = await deployerWallet.sendTransaction({
    to: testWallet.address,
    value: ethers.parseEther("1"),
  });
  await tx.wait();
  const bal = await provider.getBalance(testWallet.address);
  log(`Test wallet funded. Balance: ${ethers.formatEther(bal)} MON`);
}

/**
 * Stake on demo contract via test wallet.
 * Returns { commitmentId, stakeTxHash }
 */
async function stakeOnDemo() {
  const nextId = await demoAsDeployer.nextCommitmentId();
  const commitmentId = Number(nextId);

  const tx = await demoAsTest.stake(DEMO_CONTRACT, { value: STAKE_AMOUNT });
  const receipt = await tx.wait();

  log(
    `Staked ${ethers.formatEther(STAKE_AMOUNT)} MON → commitment #${commitmentId} (tx: ${receipt.hash})`
  );
  return { commitmentId, stakeTxHash: receipt.hash };
}

/**
 * Simulate user engagement: send a self-transfer from test wallet to itself.
 * This generates a tx log from the demo contract (since the wallet interacted
 * with it via stake), but for extra insurance we also do a raw self-transfer.
 * The worker's checkEngagement scans logs from the protocol address;
 * the Staked event (emitted during stake) already counts as engagement
 * if the worker checks after the stake tx.
 */
async function simulateEngagement() {
  const tx = await testWallet.sendTransaction({
    to: testWallet.address,
    value: 0n,
  });
  await tx.wait();
  log(`Engagement simulated (self-transfer)`);
}

/**
 * Register a commitment in the backend DB via POST /commit.
 * Uses the demo contract's 15-min deadline.
 */
async function registerCommitment({
  stake_tx_hash,
  onchain_commitment_id,
  user_wallet,
}) {
  const now = new Date();
  const deadline = new Date(now.getTime() + DEADLINE_MS);

  const res = await fetch(`${BACKEND_URL}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_wallet: user_wallet || testWallet.address,
      protocol_id: "demo-test",
      protocol_contract_address: DEMO_CONTRACT,
      staked_amount: STAKE_AMOUNT.toString(),
      stake_tx_hash,
      onchain_commitment_id,
      verify_deadline: deadline.toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /commit failed (${res.status}): ${body}`);
  }

  const record = await res.json();
  log(`Registered commitment: ${record.id} (deadline: ${record.verify_deadline})`);
  return record;
}

/**
 * Trigger worker tick via POST /worker/tick.
 * Returns the parsed JSON response.
 */
async function tick() {
  const res = await fetch(WORKER_TICK_URL, { method: "POST" });
  const body = await res.json();
  log(`Tick response: ${JSON.stringify(body)}`);
  return body;
}

/**
 * Fetch commitment record from backend.
 */
async function getCommitment(id) {
  const res = await fetch(`${BACKEND_URL}/commitments/${id}`);
  if (!res.ok) throw new Error(`GET /commitments/${id} failed (${res.status})`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wait for the throttle to expire (MIN_INTERVAL_MS = 5 min).
 * For tests we bypass by waiting exactly that long.
 */
async function waitForThrottle() {
  const waitMs = THROTTLE_MS + 2000; // +2s buffer
  log(`Waiting ${(waitMs / 1000).toFixed(0)}s for throttle window...`);
  await sleep(waitMs);
}

// ── Test Results Collector ──────────────────────────────────────────────
const results = [];

function record(test, passed, details) {
  const icon = passed ? "PASS" : "FAIL";
  results.push({ test, passed, details });
  log(`[${icon}] ${test}: ${details}`);
}

// ═══════════════════════════════════════════════════════════════════════
// Path A: Stake → Engage → Worker Verifies (happy path)
// ═══════════════════════════════════════════════════════════════════════
async function pathA() {
  log("\n═══════════════════════════════════════════════════");
  log("  PATH A: Stake → Engage → Verify (happy path)");
  log("═══════════════════════════════════════════════════\n");

  const { commitmentId, stakeTxHash } = await stakeOnDemo();
  await simulateEngagement();

  const dbRecord = await registerCommitment({
    stake_tx_hash: stakeTxHash,
    onchain_commitment_id: commitmentId,
  });

  log("Waiting for throttle window...");
  await waitForThrottle();

  log("Triggering worker tick...");
  const tickResult = await tick();

  if (tickResult.status === "skipped") {
    record("Path A", false, `Worker skipped: ${tickResult.reason}`);
    return;
  }

  const updated = await getCommitment(dbRecord.id);
  if (updated.status === "verified") {
    record(
      "Path A",
      true,
      `Commitment verified. Status: ${updated.status}, TX: ${updated.verify_tx_hash}`
    );
  } else {
    record(
      "Path A",
      false,
      `Expected status "verified", got "${updated.status}". Missed: ${updated.missed_count}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Path B: Stake → No Engagement → 3 Missed Checks → Slash
// ═══════════════════════════════════════════════════════════════════════
async function pathB() {
  log("\n═══════════════════════════════════════════════════");
  log("  PATH B: No Engagement → 3 Misses → Slash");
  log("═══════════════════════════════════════════════════\n");

  const { commitmentId, stakeTxHash } = await stakeOnDemo();

  const dbRecord = await registerCommitment({
    stake_tx_hash: stakeTxHash,
    onchain_commitment_id: commitmentId,
  });

  // Check 1
  log(`Waiting for check 1 (T+${CHECK_INTERVAL_MS / 1000}s)...`);
  await waitForThrottle();
  await tick();
  let updated = await getCommitment(dbRecord.id);
  log(`After check 1: status=${updated.status}, missed=${updated.missed_count}`);

  // Check 2
  log(`Waiting for check 2 (T+${(CHECK_INTERVAL_MS * 2) / 1000}s)...`);
  await waitForThrottle();
  await tick();
  updated = await getCommitment(dbRecord.id);
  log(`After check 2: status=${updated.status}, missed=${updated.missed_count}`);

  // Check 3 — deadline now passed, worker should slash
  log(`Waiting for check 3 (T+${(CHECK_INTERVAL_MS * 3) / 1000}s — deadline passed, expect slash)...`);
  await waitForThrottle();
  await tick();
  updated = await getCommitment(dbRecord.id);

  if (updated.status === "slashed") {
    record(
      "Path B",
      true,
      `Commitment slashed after 3 misses. TX: ${updated.verify_tx_hash}`
    );
  } else {
    record(
      "Path B",
      false,
      `Expected status "slashed", got "${updated.status}". Missed: ${updated.missed_count}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Path C: Stake → 1 Miss → User Withdraws Early
// ═══════════════════════════════════════════════════════════════════════
async function pathC() {
  log("\n═══════════════════════════════════════════════════");
  log("  PATH C: 1 Miss → Early Withdraw (stake returned)");
  log("═══════════════════════════════════════════════════\n");

  const { commitmentId, stakeTxHash } = await stakeOnDemo();

  const dbRecord = await registerCommitment({
    stake_tx_hash: stakeTxHash,
    onchain_commitment_id: commitmentId,
  });

  // Check 1 — miss
  log(`Waiting for check 1 (T+${CHECK_INTERVAL_MS / 1000}s)...`);
  await waitForThrottle();
  await tick();
  let updated = await getCommitment(dbRecord.id);
  log(`After check 1: status=${updated.status}, missed=${updated.missed_count}`);

  // User withdraws (missed_count = 1, still allowed)
  log("User initiating early withdraw (missed_count=1)...");
  const withdrawRes = await fetch(`${BACKEND_URL}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitment_id: dbRecord.id }),
  });

  if (!withdrawRes.ok) {
    const body = await withdrawRes.text();
    record("Path C", false, `POST /withdraw failed (${withdrawRes.status}): ${body}`);
    return;
  }

  updated = await getCommitment(dbRecord.id);
  if (updated.status === "withdrawn") {
    record(
      "Path C",
      true,
      `Commitment withdrawn. Status: ${updated.status}, TX: ${updated.verify_tx_hash}`
    );
  } else {
    record(
      "Path C",
      false,
      `Expected status "withdrawn", got "${updated.status}"`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Path D: Stake → No Engagement → Deadline Passes → Worker Slashes
// ═══════════════════════════════════════════════════════════════════════
async function pathD() {
  log("\n═══════════════════════════════════════════════════");
  log("  PATH D: Deadline Passes → Worker Slashes");
  log("═══════════════════════════════════════════════════\n");

  const { commitmentId, stakeTxHash } = await stakeOnDemo();

  const dbRecord = await registerCommitment({
    stake_tx_hash: stakeTxHash,
    onchain_commitment_id: commitmentId,
  });

  // Check 1 — miss
  log(`Waiting for check 1 (T+${CHECK_INTERVAL_MS / 1000}s)...`);
  await waitForThrottle();
  await tick();
  let updated = await getCommitment(dbRecord.id);
  log(`After check 1: status=${updated.status}, missed=${updated.missed_count}`);

  // Check 2 — miss, deadline imminent
  log(`Waiting for check 2 (T+${(CHECK_INTERVAL_MS * 2) / 1000}s)...`);
  await waitForThrottle();
  await tick();
  updated = await getCommitment(dbRecord.id);
  log(`After check 2: status=${updated.status}, missed=${updated.missed_count}`);

  // Check 3 — deadline passed, worker slashes
  log(`Waiting for check 3 (T+${(CHECK_INTERVAL_MS * 3) / 1000}s — deadline passed)...`);
  await waitForThrottle();
  await tick();
  updated = await getCommitment(dbRecord.id);

  if (updated.status === "slashed") {
    record(
      "Path D",
      true,
      `Commitment slashed after deadline. TX: ${updated.verify_tx_hash}`
    );
  } else {
    record(
      "Path D",
      false,
      `Expected status "slashed", got "${updated.status}". Missed: ${updated.missed_count}`
    );
  }
}

// ── Report ──────────────────────────────────────────────────────────────
function printReport() {
  console.log("\n" + "═".repeat(60));
  console.log("  TEST REPORT — KYPCommitmentDemo Compressed Timeline");
  console.log("═".repeat(60));
  console.log(`  Contract:  ${DEMO_CONTRACT}`);
  console.log(`  Backend:   ${BACKEND_URL}`);
  console.log(`  Window:    15 min, checks every ${CHECK_INTERVAL_MS / 1000}s`);
  console.log(`  Throttle:  ${THROTTLE_MS / 1000}s between ticks`);
  console.log(`  Date:      ${new Date().toISOString()}`);
  console.log("─".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.test}`);
    console.log(`         ${r.details}`);
  }

  console.log("─".repeat(60));
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("═".repeat(60) + "\n");

  return failed === 0;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("KYPCommitmentDemo — Compressed-Timeline Test Harness");
  console.log("All worker interactions go through POST /worker/tick");
  console.log(`Intervals: check=${CHECK_INTERVAL_MS / 1000}s, throttle=${THROTTLE_MS / 1000}s\n`);

  // Check backend is running
  try {
    const res = await fetch(BACKEND_URL);
    log(`Backend reachable at ${BACKEND_URL}`);
  } catch {
    log(`ERROR: Cannot reach backend at ${BACKEND_URL}. Is it running?`);
    log("Start with: cd Backend && node src/index.js");
    process.exit(1);
  }

  // Check demo contract is accessible
  try {
    const verifier = await demoAsDeployer.verifier();
    log(`Demo contract verifier: ${verifier}`);
    if (verifier.toLowerCase() !== DEMOVerifier.toLowerCase()) {
      log(
        `WARNING: Contract verifier (${verifier}) does not match deployer wallet (${DEMOVerifier})`
      );
      log("         verify/slash calls may fail (onlyVerifier modifier)");
    }
  } catch (err) {
    log(`ERROR: Cannot read demo contract: ${err.message}`);
    process.exit(1);
  }

  // Fund test wallet
  await fundTestWallet();

  // Run all 4 paths
  try {
    await pathA();
  } catch (err) {
    record("Path A", false, `Error: ${err.message}`);
    log(err.stack);
  }

  try {
    await pathB();
  } catch (err) {
    record("Path B", false, `Error: ${err.message}`);
    log(err.stack);
  }

  try {
    await pathC();
  } catch (err) {
    record("Path C", false, `Error: ${err.message}`);
    log(err.stack);
  }

  try {
    await pathD();
  } catch (err) {
    record("Path D", false, `Error: ${err.message}`);
    log(err.stack);
  }

  const allPassed = printReport();
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
