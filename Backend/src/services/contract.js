const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;

// NOTE: If KYPCommitment.sol is redeployed, re-copy the updated ABI from
// Contract/abi/KYPCommitment.json into Backend/abi/KYPCommitment.json
const ABI_PATH = path.join(__dirname, "../../abi/KYPCommitment.json");
const abi = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

const networks = {
  testnet: {
    rpc: process.env.MONAD_TESTNET_RPC,
    contractAddress: process.env.KYP_CONTRACT_ADDRESS,
  },
  mainnet: {
    rpc: process.env.MONAD_MAINNET_RPC,
    contractAddress: process.env.KYP_CONTRACT_ADDRESS_MAINNET,
  },
};

function getNetworkConfig(network) {
  const key = network === "mainnet" ? "mainnet" : "testnet";
  const cfg = networks[key];
  if (!cfg.rpc) throw new Error(`Missing RPC URL for ${key}`);
  const provider = new ethers.JsonRpcProvider(cfg.rpc);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = cfg.contractAddress
    ? new ethers.Contract(cfg.contractAddress, abi, signer)
    : null;
  return { provider, signer, contract, contractAddress: cfg.contractAddress };
}

const LOG_QUERY_LIMIT = 100;

async function findBlockAtTimestamp(provider, timestamp) {
  const targetTime = Math.floor(new Date(timestamp).getTime() / 1000);
  const latestBlock = await provider.getBlockNumber();
  const latestBlockData = await provider.getBlock(latestBlock);
  const latestTime = latestBlockData.timestamp;

  if (targetTime >= latestTime) return latestBlock;

  // Calculate actual block time from chain data instead of assuming 2s
  const refBlock = Math.max(0, latestBlock - 5000);
  const refBlockData = await provider.getBlock(refBlock);
  const refTime = refBlockData.timestamp;
  const blocksDiff = latestBlock - refBlock;
  const timeDiff = latestTime - refTime;
  const avgBlockTime = blocksDiff > 0 ? timeDiff / blocksDiff : 2;

  const secondsDiff = latestTime - targetTime;
  const estimatedBlocksBack = Math.ceil(secondsDiff / avgBlockTime) + 10;
  const fromBlock = Math.max(0, latestBlock - estimatedBlocksBack);

  console.log(`[CONTRACT] block time: ${avgBlockTime.toFixed(1)}s, range: ${fromBlock} to ${latestBlock}`);
  return fromBlock;
}

async function checkEngagement(userWallet, protocolAddress, sinceTimestamp, network) {
  const { provider } = getNetworkConfig(network);
  console.log(`[CONTRACT] checkEngagement: wallet=${userWallet}, protocol=${protocolAddress}, since=${sinceTimestamp}, network=${network || "testnet"}`);
  const fromBlock = await findBlockAtTimestamp(provider, sinceTimestamp);
  const latestBlock = await provider.getBlockNumber();
  console.log(`[CONTRACT] scanning blocks ${fromBlock} to ${latestBlock}`);

  const userAddr = ethers.getAddress(userWallet);
  const paddedUser = ethers.zeroPadValue(userAddr, 32).toLowerCase();

  // Query all events where the user's address appears in any indexed param
  let allLogs = [];
  let cursor = fromBlock;

  while (cursor <= latestBlock) {
    const toBlock = Math.min(cursor + LOG_QUERY_LIMIT - 1, latestBlock);
    console.log(`[CONTRACT] querying user logs blocks ${cursor}..${toBlock}...`);
    const logs = await provider.getLogs({
      topics: [null, paddedUser],
      fromBlock: cursor,
      toBlock: toBlock,
    });
    allLogs = allLogs.concat(logs);
    cursor = toBlock + 1;
  }

  // Filter to only logs from the protocol contract address
  const protoAddr = ethers.getAddress(protocolAddress).toLowerCase();
  const matched = allLogs.some((log) => log.address.toLowerCase() === protoAddr);

  console.log(`[CONTRACT] got ${allLogs.length} total logs from user, ${matched ? "engagement found" : "no engagement with protocol"}`);
  return matched;
}

async function callVerify(commitmentId, network) {
  const { contract } = getNetworkConfig(network);
  if (!contract) throw new Error("KYP contract not configured for this network");
  console.log(`[CONTRACT] callVerify: commitmentId=${commitmentId}, network=${network || "testnet"}`);
  const tx = await contract.verify(commitmentId);
  console.log(`[CONTRACT] verify tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[CONTRACT] verify tx confirmed: ${receipt.hash}, status=${receipt.status}`);
  return { txHash: receipt.hash, status: receipt.status };
}

async function callSlash(commitmentId, network) {
  const { contract } = getNetworkConfig(network);
  if (!contract) throw new Error("KYP contract not configured for this network");
  console.log(`[CONTRACT] callSlash: commitmentId=${commitmentId}, network=${network || "testnet"}`);
  const tx = await contract.slash(commitmentId);
  console.log(`[CONTRACT] slash tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[CONTRACT] slash tx confirmed: ${receipt.hash}, status=${receipt.status}`);
  return { txHash: receipt.hash, status: receipt.status };
}

async function getBlockNumber(timestamp) {
  const { provider } = getNetworkConfig("testnet");
  return provider.getBlockNumber(timestamp);
}

module.exports = { checkEngagement, callVerify, callSlash, getBlockNumber, getNetworkConfig };
