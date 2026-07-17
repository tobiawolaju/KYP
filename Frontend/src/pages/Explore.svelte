<script>
  import Link from "../lib/Link.svelte";
  import { protocols } from "../data/dummyData.js";

  let categories = $derived([...new Set(protocols.map((p) => p.category))]);

  let selectedCategory = $state("");
  let minScore = $state(0);

  let filtered = $derived(
    protocols.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (p.score < minScore) return false;
      return true;
    })
  );
</script>

<div class="explore-page">
  <div class="explore-header">
    <p class="explore-subtitle">Discover and research protocols on Monad</p>
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
      <label class="filter-label" for="score">Min score</label>
      <select id="score" bind:value={minScore}>
        <option value={0}>0</option>
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={30}>30</option>
        <option value={40}>40</option>
        <option value={50}>50</option>
      </select>
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
            <div class="card-name-group">
              <h3 class="card-name">{protocol.name}</h3>
              <span class="card-category">{protocol.category}</span>
            </div>
          </div>
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

  {#if filtered.length === 0}
    <div class="empty-state">
      <span class="material-symbols-outlined empty-icon">search_off</span>
      <p>No protocols match your filters.</p>
    </div>
  {/if}
</div>

<style>
  .explore-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 24px 64px;
  }
  .explore-header {
    margin-bottom: 32px;
  }
  .explore-title {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 6px;
    color: var(--text);
    letter-spacing: -0.5px;
  }
  .explore-subtitle {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0;
  }

  .filters {
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
    flex-wrap: wrap;
    align-items: flex-end;
    padding: 16px 20px;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 0;
  }
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .filter-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  .filter-group select {
    font-family: var(--sans);
    font-size: 14px;
    padding: 6px 10px;
    border-radius: 0;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    min-width: 120px;
    accent-color: var(--accent);
  }
  .filter-group select:focus {
    outline: none;
    border-color: var(--accent);
  }
  .result-count {
    margin-left: auto;
    justify-content: flex-end;
  }
  .count-badge {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-muted);
    padding: 6px 12px;
    border-radius: 0;
    background: var(--accent-bg);
    color: var(--accent);
    font-weight: 600;
  }

  .protocol-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  :global(.protocol-card) {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 0;
    padding: 22px;
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  :global(.protocol-card:hover) {
    border-color: var(--accent-border);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .card-titles {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .card-logo {
    width: 28px;
    height: 28px;
    border-radius: 0;
    object-fit: cover;
    flex-shrink: 0;
  }
  .card-name-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .card-name {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--text);
    line-height: 1.3;
  }
  .card-category {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .card-summary {
    font-size: 14px;
    line-height: 1.55;
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
    padding-top: 12px;
    border-top: 1px solid var(--border-light);
  }
  .card-network {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--mono);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    background: var(--accent-bg);
    color: var(--accent);
    text-transform: uppercase;
    font-weight: 600;
  }
  .card-network .material-symbols-outlined {
    font-size: 13px;
  }
  .card-tags {
    display: flex;
    gap: 4px;
  }
  .tag {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    background: var(--surface-hover);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 64px 24px;
  }
  .empty-icon {
    font-size: 48px;
    color: var(--border);
    display: block;
    margin-bottom: 12px;
  }
  .empty-state p {
    color: var(--text-muted);
    font-size: 15px;
  }
</style>
