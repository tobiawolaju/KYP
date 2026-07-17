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
        {#if protocol.contract_address}
          <span class="contract-address" title={protocol.contract_address}>
            {protocol.contract_address.slice(0, 6)}...{protocol.contract_address.slice(-4)}
          </span>
        {/if}
      </div>
    </div>

    <div class="profile-body">
      <div class="info-section">
        <h3 class="section-label">Summary</h3>
        <div class="summary-stamp-wrapper">
          <div class="stamp">
            <ScoreBadge score={protocol.score} size="md" />
          </div>
          <p class="section-text">{protocol.summary}</p>
        </div>
      </div>

      <div class="info-section">
        <h3 class="section-label">Who It's For</h3>
        <p class="section-text">{protocol.who_its_for}</p>
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
    </div>

    <section class="similar-section">
      <h2 class="section-title">Similar Protocols</h2>
      <div class="similar-grid">
        {#each similar as sp}
          <Link to={`/protocol/${sp.id}`} class="similar-card">
            <div class="similar-info">
              <h4>{sp.name}</h4>
              <span class="similar-category">{sp.category}</span>
            </div>
            <span class="card-score" style="color: {tierFromScore(sp.score).color}">{sp.score}/50</span>
          </Link>
        {/each}
      </div>
    </section>
  </div>

  <div class="floating-bar">
    <button class="fav-btn" class:faved={isFavorited} onclick={toggleFavorite}>
      <span class="fav-star">{isFavorited ? "★" : "☆"}</span> {isFavorited ? "Favourite" : "Add to Favourite"}
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
            <p class="modal-period">{VERIFY_WINDOW_HOURS}h commitment window</p>
          </div>
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
          <div class="modal-success-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <h3 class="modal-title" style="text-align:center;">Stake Confirmed</h3>
          <p class="modal-desc" style="text-align:center;">Your stake of {stakeAmount} MON has been committed to {protocol.name}.</p>
          <p class="modal-deadline">Resolves automatically on {deadlineTimestamp}</p>
          <div class="modal-actions" style="justify-content:center;">
            <Link to="/myprotocols" class="modal-confirm" onclick={() => { showStakeModal = false; stakeConfirmed = false; }}>View in My Protocols</Link>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{:else}
  <div class="not-found">
    <span class="material-symbols-outlined not-found-icon">search_off</span>
    <h2>Protocol not found</h2>
    <Link to="/" class="back-link">← Back to research</Link>
  </div>
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
    background: #F3F5DB;
    border: none;
    border-right: 1px solid var(--border);
    font-size: 16px;
    font-weight: 600;
    color: #000;
    cursor: pointer;
    font-family: var(--sans);
  }
  .floating-bar .fav-btn .fav-star {
    font-size: 32px;
    color: #000;
    line-height: 1;
  }
  :global(.dark) .floating-bar .fav-btn {
    background: #1a1a1a;
    color: #fff;
  }
  :global(.dark) .floating-bar .fav-btn .fav-star {
    color: #fff;
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
  .meta-badge .material-symbols-outlined {
    font-size: 14px;
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
  .summary-stamp-wrapper {
    position: relative;
  }
  .stamp {
    position: absolute;
    top: 50%;
    right: 12px;
    transform: translateY(-50%) rotate(-12deg);
    opacity: 0.75;
    pointer-events: none;
  }
  .summary-stamp-wrapper .section-text {
    position: relative;
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
  .risk-icon {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    font-family: var(--mono);
    color: #fff;
    flex-shrink: 0;
  }
  .risk-icon.contract { background: var(--rose); }
  .risk-icon.community { background: var(--amber); }
  .risk-icon.structural { background: var(--blue); }
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

  .similar-section {
    margin-top: 48px;
    border-top: 1px solid var(--border-light);
    padding-top: 32px;
  }
  .section-title {
    font-size: 20px;
    font-weight: 700;
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
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: 16px;
    text-decoration: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  :global(.similar-card:hover) {
    border-color: var(--accent-border);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }
  :global(.similar-card h4) {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }
  .similar-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .similar-category {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
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
  :global(.back-link) {
    color: var(--accent);
    font-weight: 500;
    text-decoration: none;
  }
  :global(.back-link:hover) {
    opacity: 0.8;
  }
  @media (min-width: 641px) {
    .floating-bar .fav-btn,
    .floating-bar .commit-btn {
      height: 5vw;
    }
  }
</style>
