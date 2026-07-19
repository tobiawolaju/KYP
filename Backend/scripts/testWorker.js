const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { query, update, insert, getById } = require("../src/services/db");
const { checkEngagement, callVerify, callSlash } = require("../src/services/contract");

const COMMITMENT_ID = process.argv[2] || "a2bd8e1e-df1c-4f8e-9b32-fa52e91d5270";

async function testPayoutWorker() {
  console.log("=== PAYOUT WORKER TEST ===");
  console.log(`Looking up commitment: ${COMMITMENT_ID}`);

  const { getById } = require("../src/services/db");
  const commitment = await getById("commitments", COMMITMENT_ID);
  if (!commitment) {
    console.log("Commitment not found in Firebase");
    return null;
  }

  console.log("Commitment record:");
  console.log(JSON.stringify(commitment, null, 2));

  const now = Date.now();
  const deadline = new Date(commitment.verify_deadline).getTime();
  const commitTime = new Date(commitment.commit_timestamp).getTime();
  const lastCheck = commitment.last_check_at
    ? new Date(commitment.last_check_at).getTime()
    : commitTime;

  const hoursSinceCommit = ((now - commitTime) / (60 * 60 * 1000)).toFixed(1);
  const hoursUntilDeadline = ((deadline - now) / (60 * 60 * 1000)).toFixed(1);
  const hoursSinceLastCheck = ((now - lastCheck) / (60 * 60 * 1000)).toFixed(1);

  console.log(`\nTime analysis:`);
  console.log(`  Hours since commit:     ${hoursSinceCommit}h`);
  console.log(`  Hours since last check: ${hoursSinceLastCheck}h`);
  console.log(`  Hours until deadline:   ${hoursUntilDeadline}h`);
  console.log(`  Status:                 ${commitment.status}`);
  console.log(`  Missed count:           ${commitment.missed_count}`);

  if (commitment.status !== "active") {
    console.log(`\nCommitment is ${commitment.status} — nothing to do.`);
    return commitment;
  }

  if (now >= deadline) {
    console.log(`\nDeadline PASSED — would call slash()`);
    return commitment;
  }

  if (hoursSinceLastCheck < 72) {
    console.log(`\nNot due yet — first 72h checkpoint in ${(72 - hoursSinceLastCheck).toFixed(1)}h`);
    console.log(`Worker would NOT call verify() or slash() yet.`);
    return commitment;
  }

  console.log(`\nCheckpoint due! Running engagement check...`);
  const hasEngagement = await checkEngagement(
    commitment.user_wallet,
    commitment.protocol_contract_address,
    commitment.commit_timestamp
  );
  console.log(`Engagement found: ${hasEngagement}`);

  if (hasEngagement) {
    console.log(`Worker would call verify() on-chain`);
  } else {
    console.log(`Worker would increment missed_count to ${commitment.missed_count + 1}`);
  }

  return commitment;
}

async function testSnapshot() {
  console.log("\n=== DAILY SNAPSHOT TEST ===");

  const { getById } = require("../src/services/db");
  const commitment = await getById("commitments", COMMITMENT_ID);
  if (!commitment) {
    console.log("Commitment not found");
    return;
  }

  const sinceTimestamp = commitment.last_snapshot_at || commitment.commit_timestamp;
  console.log(`Checking engagement since: ${sinceTimestamp}`);

  const hasEngagement = await checkEngagement(
    commitment.user_wallet,
    commitment.protocol_contract_address,
    sinceTimestamp
  );

  const eventType = hasEngagement ? "activity" : "no_activity";
  const now = new Date().toISOString();

  const event = {
    id: `${commitment.id}_${now.slice(0, 10)}`,
    commitment_id: commitment.id,
    user_wallet: commitment.user_wallet,
    protocol_contract_address: commitment.protocol_contract_address,
    event_type: eventType,
    timestamp: now,
  };

  console.log(`Snapshot result: ${eventType}`);
  console.log(`Event record: ${JSON.stringify(event, null, 2)}`);
  console.log(`(Not writing to Firebase in dry-run mode)`);
}

async function main() {
  try {
    await testPayoutWorker();
    await testSnapshot();
    console.log("\n=== DONE ===");
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

main();
