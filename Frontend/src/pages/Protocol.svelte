<script>
  import { useLocation } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import { getWallet } from "../lib/wallet.svelte.js";
  import { protocols } from "../data/dummyData.js";
  import { favorites } from "../data/dummyData.js";
  import { VERIFY_WINDOW_HOURS } from "../lib/constants.js";
  import ScoreBadge from "../lib/ScoreBadge.svelte";

  let location = useLocation();
  let id = $derived(location.pathname.split("/").pop());
  let protocol = $derived(protocols.find((p) => p.id === id));
  let similar = $derived(protocols.filter((p) => p.id !== protocol?.id).slice(0, 3));
  let isFavorited = $state(false);
  let showStakeModal = $state(false);
  let stakeAmount = $state("0.01");
  let wallet = getWallet();
  let stakeConfirmed = $state(false);
  let deadlineTimestamp = $state("");

  function toggleFavorite() {
    isFavorited = !isFavorited;
  }

  function tierFromScore(score) {
    if (score >= 41) return { label: "Secured", color: "var(--accent)" };
    if (score >= 31) return { label: "Solid", color: "var(--accent)" };
    if (score >= 21) return { label: "Caution", color: "var(--amber)" };
    if (score >= 11) return { label: "High risk", color: "color-mix(in srgb, var(--rose), var(--amber) 50%)" };
    return { label: "Rug potential", color: "var(--rose)" };
  }

  function handleCommit() {
    if (!wallet.authenticated) {
      wallet.login?.();
      return;
    }
    showStakeModal = true;
  }

  function confirmCommit() {
    let deadline = new Date(Date.now() + VERIFY_WINDOW_HOURS * 60 * 60 * 1000);
    deadlineTimestamp = deadline.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    stakeConfirmed = true;
  }
</script>

{#if protocol}
  <div class="protocol-page">
    <div class="sticky-bar">
      <button class="fav-btn" onclick={toggleFavorite} title={isFavorited ? "Remove from Favourites" : "Add to Favourite"}>
        <span class="fav-text">{isFavorited ? "Favourite" : "Add to Favourite"}</span>
        <span class="fav-star">{isFavorited ? "★" : "☆"}</span>
      </button>
    </div>

    <div class="profile-header">
      <div class="header-top">
        <div class="name-shield-row">
          {#if protocol.image}
            <img src={protocol.image} alt={protocol.name} class="protocol-logo" />
          {/if}
          <h1 class="protocol-name">{protocol.name}</h1>
        </div>
        <ScoreBadge score={protocol.score} />
      </div>
      <div class="header-meta">
        <span class="network-badge">{protocol.network}</span>
        <span class="chain-badge">{protocol.chain}</span>
        {#if protocol.contract_address}
          <span class="contract-address" title={protocol.contract_address}>
            {protocol.contract_address.slice(0, 6)}...{protocol.contract_address.slice(-4)}
          </span>
        {/if}
      </div>
    </div>

    <div class="profile-body">
      <div class="info-section">
        <h3 class="section-label">Who It's For</h3>
        <p class="section-text">{protocol.who_its_for}</p>
      </div>

      <div class="info-section">
        <h3 class="section-label">Summary</h3>
        <p class="section-text">{protocol.summary}</p>
      </div>

      <div class="info-section">
        <h3 class="section-label">Use Cases</h3>
        <div class="use-cases">
          {#each protocol.use_cases as uc}
            <span class="use-case-tag">{uc}</span>
          {/each}
        </div>
      </div>

      <div class="risks-section">
        <h3 class="section-label">Risks</h3>
        <div class="risk-cards">
          {#if protocol.risks.contract}
            <div class="risk-card">
              <span class="risk-type">Contract</span>
              <p class="risk-text">{protocol.risks.contract}</p>
            </div>
          {/if}
          {#if protocol.risks.community}
            <div class="risk-card">
              <span class="risk-type">Community</span>
              <p class="risk-text">{protocol.risks.community}</p>
            </div>
          {/if}
          {#if protocol.risks.structural}
            <div class="risk-card">
              <span class="risk-type">Structural</span>
              <p class="risk-text">{protocol.risks.structural}</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="links-section">
        <h3 class="section-label">Links</h3>
        <div class="link-list">
          {#if protocol.links.project}
            <a href={protocol.links.project} target="_blank" rel="noreferrer" class="link-item">Website ↗</a>
          {/if}
          {#if protocol.links.twitter}
            <a href={protocol.links.twitter} target="_blank" rel="noreferrer" class="link-item">X ↗</a>
          {/if}
          {#if protocol.links.discord}
            <a href={protocol.links.discord} target="_blank" rel="noreferrer" class="link-item">Discord ↗</a>
          {/if}
          {#if protocol.links.github}
            <a href={protocol.links.github} target="_blank" rel="noreferrer" class="link-item">GitHub ↗</a>
          {/if}
        </div>
      </div>

      <button class="commit-btn" onclick={handleCommit}>
        Commit & Stake →
      </button>
    </div>

    <section class="similar-section">
      <h2 class="section-title">Similar Protocols</h2>
      <div class="similar-grid">
        {#each similar as sp}
          <Link to={`/protocol/${sp.id}`} class="similar-card">
            <h4>{sp.name}</h4>
            <span class="card-score" style="color: {tierFromScore(sp.score).color}">{sp.score}/50</span>
          </Link>
        {/each}
      </div>
    </section>
  </div>

  {#if showStakeModal}
    <div class="modal-overlay" onclick={() => { showStakeModal = false; stakeConfirmed = false; }} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') { showStakeModal = false; stakeConfirmed = false; } }} role="dialog" tabindex="-1">
        {#if !stakeConfirmed}
          <h3 class="modal-title">Commit to {protocol.name}</h3>
          <p class="modal-period">Commitment period: {VERIFY_WINDOW_HOURS} hours</p>
          <p class="modal-desc">Stake MON to back your intention. You have {VERIFY_WINDOW_HOURS} hours to engage onchain with this protocol. Our system automatically checks your wallet and resolves your stake when the window closes — no action needed from you. Engaged in time → your stake is returned. Didn't engage → it's forfeited.</p>
          <div class="stake-input-group">
            <label for="stake-amount" class="stake-label">Stake Amount (MON)</label>
            <input id="stake-amount" type="number" bind:value={stakeAmount} min="0.001" step="0.001" class="stake-input" />
          </div>
          <div class="modal-actions">
            <button class="modal-cancel" onclick={() => { showStakeModal = false; stakeConfirmed = false; }}>Cancel</button>
            <button class="modal-confirm" onclick={confirmCommit}>Confirm & Stake</button>
          </div>
        {:else}
          <h3 class="modal-title">Stake Confirmed</h3>
          <p class="modal-desc">Your stake of {stakeAmount} MON has been committed to {protocol.name}.</p>
          <p class="modal-deadline">Resolves automatically on {deadlineTimestamp}</p>
          <div class="modal-actions">
            <Link to="/dashboard" class="modal-confirm" onclick={() => { showStakeModal = false; stakeConfirmed = false; }}>View in Dashboard</Link>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{:else}
  <div class="not-found">
    <h2>Protocol not found</h2>
    <Link to="/" class="back-link">← Back to research</Link>
  </div>
{/if}

<style>
  .protocol-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  .sticky-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 12px 0;
    margin-bottom: 20px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .fav-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    height: 22px;
  }
  .fav-btn:hover {
    opacity: 0.7;
  }
  .fav-text {
    line-height: 22px;
  }
  .fav-star {
    font-size: 22px;
    color: var(--amber);
    line-height: 1;
  }

  .profile-header {
    margin-bottom: 32px;
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
    gap: 12px;
  }
  .protocol-logo {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .protocol-name {
    font-size: 42px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
    line-height: 1.1;
  }
  .header-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .network-badge, .chain-badge {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--accent-bg);
    color: var(--accent);
    font-family: var(--mono);
  }
  .contract-address {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-muted);
  }

  .profile-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .info-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .section-label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin: 0;
  }
  .section-text {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text);
    margin: 0;
  }
  .use-cases {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .use-case-tag {
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
  }
  .risks-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .risk-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .risk-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
  }
  .risk-type {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--rose);
  }
  .risk-text {
    font-size: 14px;
    color: var(--text-muted);
    margin: 4px 0 0;
    line-height: 1.5;
  }
  .links-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .link-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .link-item {
    font-size: 14px;
    color: var(--accent);
    text-decoration: none;
    padding: 6px 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    transition: background 0.2s;
  }
  .link-item:hover {
    background: var(--accent-bg);
  }
  .commit-btn {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    margin-top: 8px;
  }
  .commit-btn:hover {
    opacity: 0.9;
  }

  .similar-section {
    margin-top: 48px;
    border-top: 1px solid var(--border);
    padding-top: 32px;
  }
  .section-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--text);
  }
  .similar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
  :global(.similar-card) {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    text-decoration: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.2s;
  }
  :global(.similar-card:hover) {
    border-color: var(--accent);
  }
  :global(.similar-card h4) {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }
  .card-score {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 700;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 32px;
    max-width: 420px;
    width: 90%;
  }
  .modal-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px;
    color: var(--text);
  }
  .modal-desc {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0 0 20px;
  }
  .modal-period {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    margin: 0 0 6px;
  }
  .modal-deadline {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin: -12px 0 20px;
    text-align: center;
  }
  .stake-input-group {
    margin-bottom: 20px;
  }
  .stake-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .stake-input {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 16px;
    font-family: var(--mono);
    box-sizing: border-box;
  }
  .stake-input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  .modal-cancel {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 14px;
    cursor: pointer;
  }
  .modal-cancel:hover {
    border-color: var(--text-muted);
  }
  :global(.modal-confirm) {
    padding: 10px 20px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }
  :global(.modal-confirm:hover) {
    opacity: 0.9;
  }

  .not-found {
    padding: 64px 24px;
    text-align: center;
  }
  .not-found h2 {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
</style>
