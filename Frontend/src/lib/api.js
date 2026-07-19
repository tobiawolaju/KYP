const BASE = import.meta.env.VITE_BACKEND_URL || "https://knowyourprotocol.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  return body;
}

export function fetchCommitments(walletAddress, network) {
  const params = new URLSearchParams({ wallet: walletAddress });
  if (network) params.set("network", network);
  return request(`/commitments?${params.toString()}`);
}

export function fetchCommitment(commitmentId) {
  return request(`/commitments/${commitmentId}`);
}

export function commitProtocol({ user_wallet, protocol_id, protocol_contract_address, staked_amount, stake_tx_hash, onchain_commitment_id, network }) {
  return request("/commit", {
    method: "POST",
    body: JSON.stringify({ user_wallet, protocol_id, protocol_contract_address, staked_amount, stake_tx_hash, onchain_commitment_id, network }),
  });
}

export function checkVerify(commitment_id) {
  return request("/verify/check", {
    method: "POST",
    body: JSON.stringify({ commitment_id }),
  });
}

export function requestVerify(commitment_id) {
  return request(`/verify?commitment_id=${encodeURIComponent(commitment_id)}`);
}

export function requestWithdraw(commitment_id) {
  return request("/withdraw", {
    method: "POST",
    body: JSON.stringify({ commitment_id }),
  });
}

export function submitResearch({ prompt, wallet_address }) {
  return request("/research", {
    method: "POST",
    body: JSON.stringify({ input_raw: prompt, wallet_address }),
  });
}

export function getProtocols(filters = {}) {
  const params = new URLSearchParams();
  if (filters.network) params.set("network", filters.network);
  if (filters.category) params.set("category", filters.category);
  if (filters.minScore != null) params.set("minScore", String(filters.minScore));
  const qs = params.toString();
  return request(`/protocols${qs ? `?${qs}` : ""}`);
}

export function getProtocol(id) {
  return request(`/protocols/${id}`);
}

export function getFavorites(wallet) {
  return request(`/favorites?wallet=${encodeURIComponent(wallet)}`);
}

export function toggleFavorite(wallet, protocol_id) {
  return request("/favorites", {
    method: "POST",
    body: JSON.stringify({ wallet, protocol_id }),
  });
}

export function flashResearch(query) {
  return request("/flash-research", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function tickWorker() {
  return request("/worker/tick", { method: "POST" });
}
