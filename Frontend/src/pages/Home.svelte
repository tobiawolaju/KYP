<script>
  import { navigate } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import { getProtocols } from "../lib/api.js";

  let searchQuery = $state("");
  let protocols = $state([]);

  $effect(() => {
    getProtocols().then((data) => { protocols = data; }).catch(() => {});
  });

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


</script>

<div class="home-page">
<section class="hero-section">
  <h1 class="hero-title">
    {#each "Know Your" as char, i}
      <span class="letter" style="animation-delay: {i * 0.12}s">{char === " " ? "\u00A0" : char}</span>
    {/each}<br />{#each "Protocol" as char, i}
      <span class="letter" style="animation-delay: {(9 + i) * 0.12}s">{char}</span>
    {/each}
  </h1>
  <p class="hero-sub">
    KYP turns lurkers into stakeholders.
  </p>
  <p class="hero-desc">
    You bookmark protocols. You read threads. You never follow through.<br />
    KYP turns research into accountable onchain commitment — and your wallet proves it.
  </p>
</section>





</div>

<div class="floating-search">
  <Link to="/protocols" class="explore-btn">Explore Protocols</Link>
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
    background: var(--bg);
  }
  .hero-section {
    position: relative;
    padding: 64px 32px 48px;
    text-align: center;
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
  :global(.dark) .hero-title::before {
    background: repeating-linear-gradient(
      to right,
      rgba(0,0,0,1) 0px,
      rgba(0,0,0,1) 2px,
      transparent 2px,
      transparent 5%
    );
    @media (min-width: 768px) {
      background: repeating-linear-gradient(
        to right,
        rgba(0,0,0,1) 0px,
        rgba(0,0,0,1) 4px,
        transparent 4px,
        transparent 5%
      );
    }
  }
  .letter {
    display: inline-block;
    animation: letterPulse 3s ease-in-out infinite;
  }
  @keyframes letterPulse {
    0%, 100% { background-color: transparent; color: var(--text); }
    30% { background-color: var(--accent); color: #fff; }
    60% { background-color: transparent; color: var(--text); }
  }
  .hero-sub {
    font-size: 20px;
    color: var(--text-muted);
    margin: 0 0 8px;
  }
  .hero-desc {
    font-size: 22.5px;
    color: var(--text) !important;
    margin: 0 0 32px;
    line-height: 1.6;
  }

  @media (min-width: 641px) {
    .hero-title {
      font-size: calc(clamp(56px, 12vw, 220px) * 0.65);
    }
  }

  .floating-search {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 50;
    width: 100vw;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
  }
  :global(.explore-btn) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 20vw;
    background: var(--accent);
    color: #fff !important;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
  }
  .search-bar {
    display: flex;
    align-items: center;
    background: var(--surface);
    border: none;
    border-radius: 0;
    padding: 0 0 0 14px;
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
    padding: 0 8px;
    font-size: 15px;
    color: var(--text);
    outline: none;
    height: 100%;
    box-sizing: border-box;
  }
  .search-input::placeholder {
    color: var(--text-muted);
  }
  .search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20vw;
    height: 20vw;
    border: none;
    border-radius: 0;
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
  @media (min-width: 641px) {
    .search-btn {
      width: 5vw;
      height: 5vw;
    }
    .search-bar {
      height: 5vw;
    }
    :global(.explore-btn) {
      height: 5vw;
    }
  }
</style>
