const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const RPC_URL = process.env.MONAD_TESTNET_RPC;
const PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.KYP_CONTRACT_ADDRESS;

const ABI_PATH = path.join(__dirname, "../../../Contract/abi/KYPCommitment.json");
const abi = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

const LOG_QUERY_LIMIT = 100;

async function findBlockAtTimestamp(timestamp) {
  const targetTime = Math.floor(new Date(timestamp).getTime() / 1000) - 300;
  const latestBlock = await provider.getBlockNumber();
  const latestBlockData = await provider.getBlock(latestBlock);
  const latestTime = latestBlockData.timestamp;

  if (targetTime >= latestTime) return latestBlock;

  const secondsDiff = latestTime - targetTime;
  const estimatedBlocksBack = Math.ceil(secondsDiff / 2) + 10;
  const fromBlock = Math.max(0, latestBlock - estimatedBlocksBack);

  console.log(`[CONTRACT] estimated block range: ${fromBlock} to ${latestBlock} (latest time: ${latestTime}, target: ${targetTime})`);
  return fromBlock;
}

async function checkEngagement(userWallet, protocolAddress, sinceTimestamp) {
  console.log(`[CONTRACT] checkEngagement: wallet=${userWallet}, protocol=${protocolAddress}, since=${sinceTimestamp}`);
  const fromBlock = await findBlockAtTimestamp(sinceTimestamp);
  const latestBlock = await provider.getBlockNumber();
  console.log(`[CONTRACT] scanning blocks ${fromBlock} to ${latestBlock}`);
  const userAddr = ethers.getAddress(userWallet);
  const protoAddr = ethers.getAddress(protocolAddress);
  const paddedUser = ethers.zeroPadValue(userAddr, 32).toLowerCase();

  let allLogs = [];
  let cursor = fromBlock;

  while (cursor <= latestBlock) {
    const toBlock = Math.min(cursor + LOG_QUERY_LIMIT - 1, latestBlock);
    console.log(`[CONTRACT] querying logs blocks ${cursor}..${toBlock}...`);
    const logs = await provider.getLogs({
      address: protoAddr,
      fromBlock: cursor,
      toBlock: toBlock,
    });
    allLogs = allLogs.concat(logs);
    cursor = toBlock + 1;
  }

  console.log(`[CONTRACT] got ${allLogs.length} total logs, scanning for user address in topics...`);

  const matched = allLogs.some((log) =>
    log.topics.some(
      (t) => t && t.toLowerCase() === paddedUser
    )
  );

  console.log(`[CONTRACT] engagement found: ${matched}`);
  return matched;
}

async function callVerify(commitmentId) {
  console.log(`[CONTRACT] callVerify: commitmentId=${commitmentId}`);
  const tx = await contract.verify(commitmentId);
  console.log(`[CONTRACT] verify tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[CONTRACT] verify tx confirmed: ${receipt.hash}, status=${receipt.status}`);
  return { txHash: receipt.hash, status: receipt.status };
}

async function callSlash(commitmentId) {
  console.log(`[CONTRACT] callSlash: commitmentId=${commitmentId}`);
  const tx = await contract.slash(commitmentId);
  console.log(`[CONTRACT] slash tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[CONTRACT] slash tx confirmed: ${receipt.hash}, status=${receipt.status}`);
  return { txHash: receipt.hash, status: receipt.status };
}

async function getBlockNumber(timestamp) {
  return provider.getBlockNumber(timestamp);
}

module.exports = { checkEngagement, callVerify, callSlash, getBlockNumber, provider, contract };
