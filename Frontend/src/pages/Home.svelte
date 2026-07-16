<script>
  import { navigate } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import { protocols } from "../data/dummyData.js";
  import ScoreBadge from "../lib/ScoreBadge.svelte";
  let searchQuery = $state("");

  const potd = protocols.find((p) => p.id === "p3");

  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = protocols.find(
      (p) => p.name.toLowerCase() === q || p.id.toLowerCase() === q
    );
    if (match) {
      navigate(`/protocol/${match.id}`);
    }
  }

  function handleTopSearch() {
    handleSearch(searchQuery);
  }

  function handleTopKeydown(e) {
    if (e.key === "Enter") handleTopSearch();
  }



  let howGrid = $state(null);
  let currentStep = $state(1);

  function onHowScroll() {
    if (!howGrid) return;
    let w = howGrid.clientWidth;
    let idx = Math.round(howGrid.scrollLeft / w) + 1;
    currentStep = Math.max(1, Math.min(3, idx));
  }
</script>

<div class="home-page">
<section class="hero-section">
  <h1 class="hero-title">
    Know Your<br /><span class="accent-text">Protocol</span>
  </h1>
  <p class="hero-sub">
    Information without action is entertainment.
  </p>
  <p class="hero-desc">
    You bookmark protocols. You read threads. You never follow through.<br />
    KYP turns research into accountable onchain commitment — and your wallet proves it.
  </p>
</section>

<section class="how-section">
  <div class="how-title-row">
    <h2 class="section-title">How It Works</h2>
    <span class="how-counter">{currentStep}/3</span>
  </div>
  <div class="how-grid" bind:this={howGrid} onscroll={onHowScroll}>
    <div class="how-step">
      <div class="how-icon-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <h3 class="how-step-title">Research</h3>
      <p class="how-step-desc">Paste any protocol link. KYP breaks it down — what it does, who it's for, and where the risks are.</p>
    </div>
    <div class="how-step">
      <div class="how-icon-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M3 12h1m16 0h1m-9-9v1m0 16v1" />
          <path d="M3 3l18 18" />
        </svg>
      </div>
      <h3 class="how-step-title">Commit</h3>
      <p class="how-step-desc">Put a small stake behind your intention to actually use it.</p>
    </div>
    <div class="how-step">
      <div class="how-icon-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a12 12 0 0 0-8.5 20" />
          <path d="M12 3a12 12 0 0 1 8.5 20" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <h3 class="how-step-title">Verify</h3>
      <p class="how-step-desc">Your wallet proves you followed through — no forms, no honesty check.</p>
    </div>
  </div>
</section>

<section class="potd-section">
  <h2 class="section-title">Protocol of the Day</h2>
  {#if potd}
    <div class="potd-card">
      <div class="potd-header">
        {#if potd.image}
          <img src={potd.image} alt={potd.name} class="potd-logo" />
        {/if}
        <h3 class="protocol-name">{potd.name}</h3>
        <ScoreBadge score={potd.score} size="md" />
      </div>

      <div class="potd-body">
        <div class="info-section">
          <h3 class="section-label">Who It's For</h3>
          <p class="section-text">{potd.who_its_for}</p>
        </div>
        <div class="info-section">
          <h3 class="section-label">Use Cases</h3>
          <div class="use-cases">
            {#each potd.use_cases as uc}
              <span class="use-case-tag">{uc}</span>
            {/each}
          </div>
        </div>
      </div>

      <div class="potd-cta">
        <Link to="/protocol/{potd.id}" class="potd-more">View full breakdown</Link>
      </div>

      <div class="potd-fade"></div>
    </div>
  {/if}
</section>

</div>

<div class="floating-search">
  <div class="search-bar">
    <span class="material-symbols-outlined search-icon">search</span>
    <input
      type="text"
      class="search-input"
      placeholder="Search a protocol..."
      bind:value={searchQuery}
      onkeydown={handleTopKeydown}
    />
    <button class="search-btn" onclick={handleTopSearch} aria-label="Search">
      <span class="material-symbols-outlined">arrow_forward</span>
    </button>
  </div>
</div>

<style>
  .home-page {
    min-height: calc(100vh - 53px);
    background: linear-gradient(to bottom, var(--bg) 0%, var(--bg) 75%, var(--accent) 75%, var(--accent) 100%);
    padding-bottom: 100px;
    margin-bottom: -100px;
  }
  .hero-section {
    position: relative;
    padding: 64px 32px 48px;
    text-align: center;
    border-bottom: 1px solid var(--border);
  }
  .hero-title {
    position: relative;
    display: inline-block;
    font-size: clamp(56px, 12vw, 220px);
    font-weight: 900;
    line-height: 1.1;
    margin: 0 0 16px;
    letter-spacing: -1.5px;
    color: var(--text);
  }
  .hero-title::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      to right,
      rgba(255,255,255,1) 0px,
      rgba(255,255,255,1) 2px,
      transparent 2px,
      transparent 5%
    );
    @media (min-width: 768px) {
      background: repeating-linear-gradient(
        to right,
        rgba(255,255,255,1) 0px,
        rgba(255,255,255,1) 4px,
        transparent 4px,
        transparent 5%
      );
    }
  }
  .hero-title .accent-text {
    color: var(--text);
  }
  .hero-sub {
    font-size: 20px;
    color: var(--text-muted);
    margin: 0 0 8px;
  }
  .hero-desc {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0 0 32px;
    line-height: 1.6;
  }

  .how-section {
    padding: 48px 32px;
    text-align: center;
  }
  .how-title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 24px;
  }
  .how-title-row .section-title {
    margin: 0;
  }
  .how-counter {
    display: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    font-family: var(--mono);
  }
  .how-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    max-width: 720px;
    margin: 0 auto;
  }
  .how-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .how-icon-circle {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .how-step-title {
    font-size: 17px;
    font-weight: 600;
    margin: 0;
    color: var(--text);
  }
  .how-step-desc {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
    margin: 0;
    max-width: 220px;
  }

  @media (max-width: 640px) {
    .how-grid {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      gap: 0;
      max-width: 100%;
      scrollbar-width: none;
    }
    .how-grid::-webkit-scrollbar {
      display: none;
    }
    .how-step {
      min-width: 100%;
      scroll-snap-align: start;
      padding: 0 32px;
      box-sizing: border-box;
    }
    .how-section {
      padding: 48px 0;
    }
    .how-counter {
      display: inline;
    }
  }

  .potd-section {
    padding: 24px 32px;
    border-bottom: 1px solid var(--border);
  }
  .section-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 24px;
    color: var(--text);
  }
  .potd-card {
    background: var(--surface);
    padding: 24px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }
  .potd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }
  .potd-logo {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .protocol-name {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
    line-height: 1.2;
  }
  .potd-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 160px;
    overflow: hidden;
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
    font-size: 14px;
    line-height: 1.5;
    color: #000;
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
    background: var(--bg);
    border: 1px solid var(--border);
    color: #000;
  }
  .potd-fade {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100px;
    background: linear-gradient(to bottom, transparent, var(--surface));
    pointer-events: none;
  }
  .potd-cta {
    text-align: center;
    position: relative;
    z-index: 1;
    padding: 8px 0 4px;
  }
  :global(.potd-more) {
    font-size: 14px;
    font-weight: 600;
    color: #000;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  :global(.potd-more:hover) {
    opacity: 0.7;
  }

  .floating-search {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    width: 100%;
    max-width: 440px;
    padding: 0 16px;
    box-sizing: border-box;
  }
  .search-bar {
    display: flex;
    align-items: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 4px 4px 4px 14px;
    box-shadow: var(--shadow-lg);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-bar:focus-within {
    border-color: var(--accent);
    box-shadow: var(--shadow-lg), 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  .search-icon {
    font-size: 20px;
    color: var(--text-muted);
  }
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 10px 8px;
    font-size: 15px;
    color: var(--text);
    outline: none;
  }
  .search-input::placeholder {
    color: var(--text-muted);
  }
  .search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: var(--radius-full);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }
  .search-btn:hover {
    opacity: 0.9;
  }
  .search-btn .material-symbols-outlined {
    font-size: 18px;
  }
</style>
