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

async function checkEngagement(userWallet, protocolAddress, sinceTimestamp, network) {
  const { provider } = getNetworkConfig(network);
  console.log(`[CONTRACT] checkEngagement: wallet=${userWallet}, protocol=${protocolAddress}, since=${sinceTimestamp}, network=${network || "testnet"}`);
  const fromBlock = await findBlockAtTimestamp(provider, sinceTimestamp);
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

async function callVerify(commitmentId, contractAddress, network) {
  const { contract: defaultContract, contractAddress: defaultAddr } = getNetworkConfig(network);
  const target = contractAddress
    ? new ethers.Contract(contractAddress, abi, defaultContract.runner)
    : defaultContract;
  console.log(`[CONTRACT] callVerify: commitmentId=${commitmentId}, contract=${contractAddress || defaultAddr}, network=${network || "testnet"}`);
  const tx = await target.verify(commitmentId);
  console.log(`[CONTRACT] verify tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[CONTRACT] verify tx confirmed: ${receipt.hash}, status=${receipt.status}`);
  return { txHash: receipt.hash, status: receipt.status };
}

async function callSlash(commitmentId, contractAddress, network) {
  const { contract: defaultContract, contractAddress: defaultAddr } = getNetworkConfig(network);
  const target = contractAddress
    ? new ethers.Contract(contractAddress, abi, defaultContract.runner)
    : defaultContract;
  console.log(`[CONTRACT] callSlash: commitmentId=${commitmentId}, contract=${contractAddress || defaultAddr}, network=${network || "testnet"}`);
  const tx = await target.slash(commitmentId);
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
