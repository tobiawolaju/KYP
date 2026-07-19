<script>
  import { navigate } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import VideoOverlay from "../lib/VideoOverlay.svelte";
  import { flashResearch } from "../lib/api.js";
  import { getNetwork } from "../lib/network.svelte.js";
  import SearchBar from "../lib/SearchBar.svelte";

  const network = getNetwork();
  let showVideo = $state(false);
  let searching = $state(false);

  async function handleSearch(query) {
    const q = query.trim();
    if (!q || searching) return;
    searching = true;
    try {
      const result = await flashResearch(q, network.current);
      if (result?.id) {
        navigate(`/protocol/${result.id}`);
      } else {
        navigate(`/protocols?q=${encodeURIComponent(q)}`);
      }
    } catch (e) {
      navigate(`/protocols?q=${encodeURIComponent(q)}`);
    } finally {
      searching = false;
    }
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
  <div class="btn-row">
    <Link to="/protocols" class="explore-btn">Explore Protocols</Link>
    <button class="how-btn" onclick={() => { showVideo = true; }}>How it works</button>
  </div>
  <SearchBar onSearch={handleSearch} {searching} />
</div>

<VideoOverlay bind:open={showVideo} videoId="PKtnafFtfEo" />

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
      transparent 1.667%
    );
    @media (min-width: 768px) {
      background: repeating-linear-gradient(
        to right,
        rgba(255,255,255,1) 0px,
        rgba(255,255,255,1) 4px,
        transparent 4px,
        transparent 1.667%
      );
    }
  }
  :global(.dark) .hero-title::before {
    background: repeating-linear-gradient(
      to right,
      rgba(0,0,0,1) 0px,
      rgba(0,0,0,1) 2px,
      transparent 2px,
      transparent 1.667%
    );
    @media (min-width: 768px) {
      background: repeating-linear-gradient(
        to right,
        rgba(0,0,0,1) 0px,
        rgba(0,0,0,1) 4px,
        transparent 4px,
        transparent 1.667%
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
  .btn-row {
    display: flex;
    width: 100%;
  }
  :global(.explore-btn) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 70vw;
    height: 20vw;
    background: var(--accent);
    color: #fff !important;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    border: none;
    border-right: 2px solid var(--bg);
    cursor: pointer;
  }
  .how-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30vw;
    height: 20vw;
    background: #6025c5;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-family: var(--sans);
  }

  @media (min-width: 641px) {
    :global(.explore-btn) {
      height: 5vw;
    }
    .how-btn {
      height: 5vw;
    }
  }
</style>
