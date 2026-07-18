<script>
  import { useLocation } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import { getWallet } from "../lib/wallet.svelte.js";
  import { VERIFY_WINDOW_HOURS } from "../lib/constants.js";
  import { getProtocol, getFavorites, toggleFavorite as apiToggleFavorite, commitProtocol } from "../lib/api.js";
  import ScoreBadge from "../lib/ScoreBadge.svelte";

  const KYP_CONTRACT = import.meta.env.VITE_KYP_CONTRACT_ADDRESS || "0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf";
  const STAKE_ABI = ["function stake(address protocolAddress) payable returns (uint256)"];

  let location = useLocation();
  let id = $derived(location.pathname.split("/").pop());

  let protocol = $state(null);
  let isFavorited = $state(false);
  let showStakeModal = $state(false);
  let stakeAmount = $state("0.01");
  let wallet = getWallet();
  let stakeConfirmed = $state(false);
  let stakeLoading = $state(false);
  let stakeError = $state("");
  let deadlineTimestamp = $state("");

  let loadStatus = $state("idle");
  let loadError = $state("");
  let coldTimer = null;

  let deepCountdown = $state(0);
  let deepTimer = null;

  function startDeepCountdown() {
    clearInterval(deepTimer);
    deepCountdown = 40;
    deepTimer = setInterval(() => {
      deepCountdown--;
      if (deepCountdown <= 0) {
        clearInterval(deepTimer);
        loadProtocol(id);
      }
    }, 1000);
  }

  function isDeepResearchPending(p) {
    return p && (p.deep_research_status === "pending" || p.deep_research_status === "running");
  }

  function loadProtocol(protocolId) {
    clearTimeout(coldTimer);
    loadStatus = "fetching";
    loadError = "";
    protocol = null;
    coldTimer = setTimeout(() => {
      if (loadStatus === "fetching") loadStatus = "waking";
    }, 4000);
    getProtocol(protocolId)
      .then((data) => {
        clearTimeout(coldTimer);
        protocol = data;
        loadStatus = "success";
        if (isDeepResearchPending(data)) {
          startDeepCountdown();
        }
      })
      .catch((err) => { clearTimeout(coldTimer); loadError = err.message || "Protocol not found"; loadStatus = "error"; });
  }

  $effect(() => {
    if (id) loadProtocol(id);
    return () => { clearInterval(deepTimer); };
  });

  $effect(() => {
    if (wallet.authenticated && wallet.address && id) {
      getFavorites(wallet.address).then((favs) => {
        isFavorited = favs.some((f) => f.protocol_id === id);
      }).catch(() => {});
    }
  });

  async function toggleFavorite() {
    if (!wallet.authenticated || !wallet.address) {
      wallet.login?.();
      return;
    }
    try {
      const result = await apiToggleFavorite(wallet.address, id);
      isFavorited = result.favorited;
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  }

  function handleCommit() {
    if (!wallet.authenticated) {
      wallet.login?.();
      return;
    }
    showStakeModal = true;
  }

  async function confirmCommit() {
    stakeLoading = true;
    stakeError = "";
    try {
      const ethereumProvider = await wallet.getProvider();
      if (!ethereumProvider) throw new Error("Wallet provider not available");

      const { BrowserProvider, Contract, parseEther, Interface } = await import("ethers");
      const provider = new BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const kyp = new Contract(KYP_CONTRACT, STAKE_ABI, signer);
      const protocolAddr = protocol.contracts?.[0]?.address;
      if (!protocolAddr) throw new Error("No contract address found for this protocol");
      const tx = await kyp.stake(protocolAddr, { value: parseEther(stakeAmount) });
      const receipt = await tx.wait();

      const iface = new Interface(["event Staked(uint256 indexed commitmentId, address indexed user, address indexed protocolAddress, uint256 amount, uint256 verifyDeadline)"]);
      let onchainCommitmentId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          if (parsed.name === "Staked") {
            onchainCommitmentId = Number(parsed.args.commitmentId);
            break;
          }
        } catch {}
      }

      await commitProtocol({
        user_wallet: userAddress,
        protocol_id: protocol.id,
        protocol_contract_address: protocolAddr,
        staked_amount: parseEther(stakeAmount).toString(),
        stake_tx_hash: receipt.hash,
        onchain_commitment_id: onchainCommitmentId,
      });

      let deadline = new Date(Date.now() + VERIFY_WINDOW_HOURS * 60 * 60 * 1000);
      deadlineTimestamp = deadline.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      stakeConfirmed = true;
    } catch (err) {
      console.error("Commit failed:", err);
      stakeError = err.message || "Transaction failed";
    } finally {
      stakeLoading = false;
    }
  }
</script>

{#if loadStatus === "fetching" || loadStatus === "waking"}
  <div class="protocol-loading">
    <span class="material-symbols-outlined loading-icon spin">progress_activity</span>
    {#if loadStatus === "waking"}
      <p class="loading-text">Server is waking up...</p>
      <p class="loading-sub">Free tier backend takes ~30s on first request</p>
    {:else}
      <p class="loading-text">Loading protocol...</p>
    {/if}
  </div>
{:else if loadStatus === "error"}
  <div class="protocol-loading error">
    <span class="material-symbols-outlined loading-icon">error</span>
    <p class="loading-text">{loadError}</p>
    <button class="retry-btn" onclick={() => loadProtocol(id)}>Try Again</button>
  </div>
{:else if protocol}
  <div class="protocol-page">
    {#if isDeepResearchPending(protocol)}
      <div class="deep-research-banner">
        <span class="material-symbols-outlined banner-icon spin">progress_activity</span>
        <span class="banner-text">Deep research running in the background — refreshing in {deepCountdown}s</span>
      </div>
    {/if}
    <div class="profile-header">
      <div class="header-top">
        <div class="name-shield-row">
          {#if protocol.image}
            <img src={protocol.image} alt={protocol.name} class="protocol-logo" />
          {/if}
          <h1 class="protocol-name">{protocol.name}</h1>
        </div>
      </div>
      <div class="header-meta">
        <span class="meta-badge chain">{protocol.chain}</span>
        {#if protocol.contracts?.[0]?.address}
          <span class="contract-address" title={protocol.contracts[0].address}>
            {protocol.contracts[0].address.slice(0, 6)}...{protocol.contracts[0].address.slice(-4)}
          </span>
        {/if}
      </div>
    </div>

    <div class="profile-body">
      <div class="info-section">
        <h3 class="section-label">Summary</h3>
        <p class="section-text">{protocol.summary}</p>
      </div>

      {#if protocol.who_its_for}
        <div class="info-section">
          <h3 class="section-label">Who It's For</h3>
          <p class="section-text">{protocol.who_its_for}</p>
        </div>
      {/if}

      {#if protocol.use_cases && protocol.use_cases.length > 0}
        <div class="info-section">
          <h3 class="section-label">Use Cases</h3>
          <div class="use-cases">
            {#each protocol.use_cases as uc}
              <span class="use-case-tag">{uc}</span>
            {/each}
          </div>
        </div>
      {/if}

      {#if protocol.risks}
        <div class="risks-section">
          <h3 class="section-label">Risks</h3>
          <div class="risk-cards">
            {#if protocol.risks.contract}
              <div class="risk-card">
                <div class="risk-header">
                  <span class="risk-type">Contract</span>
                </div>
                <p class="risk-text">{protocol.risks.contract}</p>
              </div>
            {/if}
            {#if protocol.risks.community}
              <div class="risk-card">
                <div class="risk-header">
                  <span class="risk-type">Community</span>
                </div>
                <p class="risk-text">{protocol.risks.community}</p>
              </div>
            {/if}
            {#if protocol.risks.structural}
              <div class="risk-card">
                <div class="risk-header">
                  <span class="risk-type">Structural</span>
                </div>
                <p class="risk-text">{protocol.risks.structural}</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if protocol.links}
        <div class="links-section">
          <h3 class="section-label">Links</h3>
          <div class="link-list">
            {#if protocol.links.project}
              <a href={protocol.links.project} target="_blank" rel="noreferrer" class="link-item">
                <span class="material-symbols-outlined">language</span>
                Website
              </a>
            {/if}
            {#if protocol.links.twitter}
              <a href={protocol.links.twitter} target="_blank" rel="noreferrer" class="link-item">
                <span class="material-symbols-outlined">tag</span>
                X
              </a>
            {/if}
            {#if protocol.links.discord}
              <a href={protocol.links.discord} target="_blank" rel="noreferrer" class="link-item">
                <span class="material-symbols-outlined">chat</span>
                Discord
              </a>
            {/if}
            {#if protocol.links.github}
              <a href={protocol.links.github} target="_blank" rel="noreferrer" class="link-item">
                <span class="material-symbols-outlined">code</span>
                GitHub
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="badge-bottom">
      <ScoreBadge score={protocol.score} size="lg" />
    </div>
  </div>

  <div class="floating-bar">
    <button class="fav-btn" class:faved={isFavorited} onclick={toggleFavorite}>
      {isFavorited ? "Saved!" : "Save to Favourite"} <span class="fav-star">{isFavorited ? "★" : "☆"}</span>
    </button>
    <button class="commit-btn" onclick={handleCommit}>
      Commit
    </button>
  </div>

  {#if showStakeModal}
    <div class="modal-overlay" onclick={() => { showStakeModal = false; stakeConfirmed = false; }} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') { showStakeModal = false; stakeConfirmed = false; } }} role="dialog" tabindex="-1">
        {#if !stakeConfirmed}
          <div class="modal-header">
            <h3 class="modal-title">Commit to {protocol.name}</h3>
            <p class="modal-period">{VERIFY_WINDOW_HOURS}h commitment window (3 checks)</p>
          </div>
          <p class="modal-desc">Stake MON to back your intention. We check your onchain activity every 72 hours — 3 times over 9 days. Engaged in time → your stake is returned. Miss all 3 checks → it's forfeited.</p>
          <div class="stake-input-group">
            <label for="stake-amount" class="stake-label">Stake Amount (MON)</label>
            <input id="stake-amount" type="number" bind:value={stakeAmount} min="0.001" step="0.001" class="stake-input" disabled={stakeLoading} />
          </div>
          {#if stakeError}
            <p class="stake-error">{stakeError}</p>
          {/if}
          <div class="modal-actions">
            <button class="modal-cancel" onclick={() => { showStakeModal = false; stakeConfirmed = false; stakeError = ""; }} disabled={stakeLoading}>Cancel</button>
            <button class="modal-confirm" onclick={confirmCommit} disabled={stakeLoading}>
              {stakeLoading ? "Staking..." : "Confirm & Stake"}
            </button>
          </div>
        {:else}
          <div class="modal-success-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <h3 class="modal-title" style="text-align:center;">Stake Confirmed</h3>
          <p class="modal-desc" style="text-align:center;">Your stake of {stakeAmount} MON has been committed to {protocol.name}. We'll check your activity at 72h, 144h, and 216h.</p>
          <p class="modal-deadline">Resolves automatically on {deadlineTimestamp}</p>
          <div class="modal-actions" style="justify-content:center;">
            <Link to="/myprotocols" class="modal-confirm" onclick={() => { showStakeModal = false; stakeConfirmed = false; }}>View in My Protocols</Link>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .protocol-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 120px;
  }
  .floating-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    display: flex;
    z-index: 50;
  }
  .floating-bar .fav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0;
    height: 20vw;
    background: #fff;
    border: none;
    border-right: 1px solid var(--border);
    font-size: 11px;
    font-weight: 600;
    color: #f5c518;
    cursor: pointer;
    font-family: var(--sans);
  }
  .floating-bar .fav-btn .fav-star {
    font-size: 32px;
    color: #f5c518;
    line-height: 1;
  }
  :global(.dark) .floating-bar .fav-btn {
    background: #1a1a1a;
  }
  .floating-bar .fav-btn.faved {
    background: var(--surface);
    color: #f5c518;
  }
  .floating-bar .fav-btn.faved .fav-star {
    color: #f5c518;
  }
  .floating-bar .commit-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    height: 20vw;
    background: #5D2CB2;
    border: none;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    font-family: var(--sans);
  }

  .profile-header {
    margin-bottom: 36px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    position: relative;
  }
  .name-shield-row {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .protocol-logo {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
  }
  .protocol-name {
    font-size: 36px;
    font-weight: 800;
    margin: 0;
    color: var(--text);
    line-height: 1.1;
    letter-spacing: -0.5px;
  }
  .header-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: var(--accent-bg);
    color: var(--accent);
    font-family: var(--mono);
    font-weight: 600;
  }
  .meta-badge.chain {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }
  .contract-address {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 8px;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
  }

  .profile-body {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .info-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-label {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }
  .section-text {
    font-size: 15px;
    line-height: 1.65;
    color: var(--text-secondary);
    margin: 0;
  }
  .badge-bottom {
    display: flex;
    justify-content: flex-end;
    margin-top: 32px;
    transform: rotate(-18deg);
    opacity: 0.85;
    pointer-events: none;
    align-self: flex-end;
  }
  .use-cases {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .use-case-tag {
    font-size: 13px;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    background: var(--accent-bg);
    color: var(--accent);
    font-weight: 500;
  }
  .risks-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .risk-cards {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .risk-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .risk-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .risk-type {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .risk-text {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.55;
  }
  .links-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .link-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .link-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--accent);
    text-decoration: none;
    padding: 6px 14px;
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-sm);
    transition: background 0.2s, border-color 0.2s;
  }
  .link-item:hover {
    background: var(--accent-bg);
    border-color: var(--accent);
  }
  .link-item .material-symbols-outlined {
    font-size: 16px;
  }

  .card-score {
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 32px;
    max-width: 420px;
    width: 90%;
    box-shadow: var(--shadow-xl);
  }
  .modal-header {
    margin-bottom: 12px;
  }
  .modal-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text);
  }
  .modal-period {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    margin: 0;
  }
  .modal-desc {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .modal-deadline {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 20px;
    text-align: center;
    padding: 10px;
    background: var(--accent-bg);
    border-radius: var(--radius-sm);
  }
  .stake-input-group {
    margin-bottom: 20px;
  }
  .stake-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .stake-input {
    width: 100%;
    padding: 12px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 16px;
    font-family: var(--mono);
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .stake-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .modal-cancel {
    padding: 10px 18px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: var(--sans);
    transition: background 0.2s;
  }
  .modal-cancel:hover {
    background: var(--border-light);
  }
  :global(.modal-confirm) {
    display: inline-flex;
    align-items: center;
    padding: 10px 18px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-full);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  :global(.modal-confirm:hover) {
    opacity: 0.9;
  }
  .modal-success-icon {
    text-align: center;
    margin-bottom: 12px;
  }
  .modal-success-icon .material-symbols-outlined {
    font-size: 48px;
    color: var(--green);
  }
  .stake-error {
    font-size: 13px;
    color: var(--rose);
    margin: 0 0 12px;
    padding: 8px 12px;
    background: var(--rose-bg);
    border-radius: var(--radius-sm);
  }

  .protocol-loading {
    text-align: center;
    padding: 80px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .deep-research-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #e8740c;
    color: #fff;
    border-radius: var(--radius-md);
    margin-bottom: 24px;
    font-size: 14px;
    font-weight: 600;
  }
  .banner-icon {
    font-size: 20px;
    flex-shrink: 0;
  }
  .loading-icon {
    font-size: 40px;
    color: var(--accent);
  }
  .protocol-loading.error .loading-icon {
    color: var(--rose);
  }
  .loading-text {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0;
  }
  .loading-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    opacity: 0.7;
  }
  .retry-btn {
    margin-top: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--sans);
  }
  .spin {
    animation: spin 1.2s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .not-found {
    padding: 80px 24px;
    text-align: center;
  }
  .not-found-icon {
    font-size: 56px;
    color: var(--border);
    display: block;
    margin-bottom: 16px;
  }
  .not-found h2 {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  @media (min-width: 641px) {
    .floating-bar .fav-btn,
    .floating-bar .commit-btn {
      height: 5vw;
    }
  }
</style>
