<script>
  import Link from "../lib/Link.svelte";
  import { protocols } from "../data/dummyData.js";

  let categories = $derived([...new Set(protocols.map((p) => p.category))]);
  let networks = $derived([...new Set(protocols.map((p) => p.network))]);

  let selectedCategory = $state("");
  let selectedNetwork = $state("");
  let minScore = $state(0);

  let filtered = $derived(
    protocols.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedNetwork && p.network !== selectedNetwork) return false;
      if (p.score < minScore) return false;
      return true;
    })
  );

  function scoreColor(score) {
    if (score >= 40) return "var(--accent)";
    if (score >= 30) return "var(--amber)";
    return "var(--rose)";
  }

  function formatScore(score) {
    return score + "/50";
  }
</script>

<div class="explore-page">
  <div class="explore-header">
    <h1 class="explore-title">Explore Protocols</h1>
  </div>

  <div class="filters">
    <div class="filter-group">
      <label class="filter-label" for="cat">Category</label>
      <select id="cat" bind:value={selectedCategory}>
        <option value="">All</option>
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label" for="net">Network</label>
      <select id="net" bind:value={selectedNetwork}>
        <option value="">All</option>
        {#each networks as net}
          <option value={net}>{net}</option>
        {/each}
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label" for="score">Min score: {minScore}</label>
      <input id="score" type="range" min="0" max="50" step="1" bind:value={minScore} />
    </div>

    <div class="filter-group result-count">
      <span class="count-badge">{filtered.length} protocol{filtered.length !== 1 ? "s" : ""}</span>
    </div>
  </div>

  <div class="protocol-grid">
    {#each filtered as protocol}
      <Link to={`/protocol/${protocol.id}`} class="protocol-card">
        <div class="card-top">
          <div class="card-titles">
            {#if protocol.image}
              <img src={protocol.image} alt={protocol.name} class="card-logo" />
            {/if}
            <h3 class="card-name">{protocol.name}</h3>
            <span class="card-category">{protocol.category}</span>
          </div>
          <span class="card-score" style="color: {scoreColor(protocol.score)}">
            {formatScore(protocol.score)}
          </span>
        </div>
        <p class="card-summary">{protocol.summary}</p>
        <div class="card-footer">
          <span class="card-network">{protocol.network}</span>
          <div class="card-tags">
            {#each protocol.use_cases.slice(0, 2) as uc}
              <span class="tag">{uc}</span>
            {/each}
          </div>
        </div>
      </Link>
    {/each}
  </div>

  {#if filtered.length === 0}
    <div class="empty-state">
      <p>No protocols match your filters.</p>
    </div>
  {/if}
</div>

<style>
  .explore-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  .explore-header {
    margin-bottom: 28px;
  }
  .explore-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }

  .filters {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .filter-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  .filter-group select,
  .filter-group input[type="range"] {
    font-family: var(--sans);
    font-size: 14px;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
  }
  .filter-group select {
    min-width: 120px;
  }
  .filter-group input[type="range"] {
    min-width: 140px;
    padding: 0;
    accent-color: var(--accent);
  }
  .result-count {
    margin-left: auto;
    justify-content: flex-end;
  }
  .count-badge {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 6px;
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .protocol-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .card-titles {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .card-logo {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .card-name {
    font-size: 17px;
    font-weight: 600;
    margin: 0;
    color: var(--text);
  }
  .card-category {
    font-size: 12px;
    color: var(--accent);
    font-weight: 500;
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
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: auto;
  }
  .card-network {
    font-family: var(--mono);
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--accent-bg);
    color: var(--accent);
    text-transform: uppercase;
  }
  .card-tags {
    display: flex;
    gap: 4px;
  }
  .tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--accent-bg);
    color: var(--accent);
  }

  .empty-state {
    text-align: center;
    padding: 64px 24px;
  }
  .empty-state p {
    color: var(--text-muted);
    font-size: 15px;
  }
</style>
