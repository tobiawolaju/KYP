<script>
  import { navigate } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import { protocols } from "../data/dummyData.js";

  const featured = protocols.slice(0, 4);

  let searchQuery = $state("");

  function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const match = protocols.find(
      (p) => p.name.toLowerCase() === q || p.id.toLowerCase() === q
    );
    if (match) {
      navigate(`/protocol/${match.id}`);
    }
  }

  function handleKeydown(e) {
    if (e.key === "Enter") handleSearch();
  }

  function scoreColor(score) {
    if (score >= 40) return "var(--accent)";
    if (score >= 30) return "var(--amber)";
    return "var(--rose)";
  }

  function formatScore(score) {
    return score + "/50";
  }
</script>

<section class="hero-section">
  <h1 class="hero-title">
    Know Your<br /><span class="accent-text">Protocol</span>
  </h1>
  <p class="hero-sub">
    Research it. Act on it. Prove you did.
  </p>
  <p class="hero-desc">
    Paste a link, get a research-backed profile. Commit with a stake.<br />
    Verify engagement onchain. No honor system.
  </p>
  <div class="search-bar">
    <input
      type="text"
      class="search-input"
      placeholder="Search a protocol..."
      bind:value={searchQuery}
      onkeydown={handleKeydown}
    />
    <button class="search-btn" onclick={handleSearch} aria-label="Search">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </button>
  </div>
</section>

<section class="featured-section">
  <h2 class="section-title">Featured Protocols</h2>
  <div class="protocol-grid">
    {#each featured as protocol}
      <Link to={`/protocol/${protocol.id}`} class="protocol-card">
        <div class="card-header">
          <h3 class="card-name">{protocol.name}</h3>
          <span class="card-score" style="color: {scoreColor(protocol.score)}">
            {formatScore(protocol.score)}
          </span>
        </div>
        <p class="card-summary">{protocol.summary}</p>
        <div class="card-tags">
          {#each protocol.use_cases.slice(0, 2) as uc}
            <span class="tag">{uc}</span>
          {/each}
        </div>
      </Link>
    {/each}
  </div>
</section>

<style>
  .hero-section {
    padding: 64px 32px 48px;
    text-align: center;
    border-bottom: 1px solid var(--border);
  }
  .hero-title {
    font-size: 72px;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 16px;
    letter-spacing: -1.5px;
    color: var(--text);
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
  .search-bar {
    display: flex;
    align-items: center;
    max-width: 420px;
    margin: 0 auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px 4px 4px 16px;
    transition: border-color 0.2s;
  }
  .search-bar:focus-within {
    border-color: var(--accent);
  }
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 10px 0;
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
    border-radius: 8px;
    background: var(--accent);
    color: var(--bg);
    cursor: pointer;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }
  .search-btn:hover {
    opacity: 0.9;
  }

  .featured-section {
    padding: 48px 32px;
  }
  .section-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 24px;
    color: var(--text);
  }
  .protocol-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }
  :global(.protocol-card) {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, transform 0.15s;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  :global(.protocol-card:hover) {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .card-name {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    color: var(--text);
  }
  .card-score {
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }
  .card-summary {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tag {
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--accent-bg);
    color: var(--accent);
  }
</style>
