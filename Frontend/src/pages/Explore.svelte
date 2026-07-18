<script>
  import { onMount } from "svelte";
  import Link from "../lib/Link.svelte";
  import { getProtocols } from "../lib/api.js";

  let allProtocols = $state([]);
  let status = $state("idle");
  let errorMsg = $state("");
  let coldTimer = null;
  let searchQuery = $state("");

  function loadProtocols() {
    clearTimeout(coldTimer);
    status = "fetching";
    errorMsg = "";
    coldTimer = setTimeout(() => {
      if (status === "fetching") status = "waking";
    }, 4000);
    getProtocols()
      .then((data) => { clearTimeout(coldTimer); allProtocols = data; status = "success"; })
      .catch((err) => { clearTimeout(coldTimer); errorMsg = err.message || "Failed to load protocols"; status = "error"; });
  }

  $effect(() => { loadProtocols(); });

  let categories = $derived([...new Set(allProtocols.map((p) => p.category))]);

  let selectedCategory = $state("");
  let minScore = $state(0);

  let catOpen = $state(false);
  let scoreOpen = $state(false);

  let catLabel = $derived(selectedCategory || "All");
  let scoreLabel = $derived(minScore === 0 ? "Any" : `${minScore}+`);

  let filtered = $derived(
    allProtocols.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if ((p.score ?? 0) < minScore) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = `${p.name} ${p.category} ${p.subcategory || ""} ${p.allCategories || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
  );

  function pickCat(val) {
    selectedCategory = val;
    catOpen = false;
  }
  function pickScore(val) {
    minScore = val;
    scoreOpen = false;
  }

  function handleClickOutside(e) {
    if (!e.target.closest(".dd-wrap")) {
      catOpen = false;
      scoreOpen = false;
    }
  }
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("q")) searchQuery = params.get("q");
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  });
</script>

<div class="explore-page">
  <div class="explore-header">
    <p class="explore-subtitle">Discover and research protocols on Monad</p>
  </div>

  <div class="filters">
    <div class="search-wrap">
      <span class="material-symbols-outlined search-icon">search</span>
      <input
        type="text"
        class="search-input"
        placeholder="Search protocols..."
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => { searchQuery = ""; }}>
          <span class="material-symbols-outlined">close</span>
        </button>
      {/if}
    </div>

    <div class="dd-wrap">
      <button class="dd-trigger" onclick={() => { catOpen = !catOpen; scoreOpen = false; }}>
        <span class="dd-label">Category</span>
        <span class="dd-value">{catLabel}</span>
        <span class="material-symbols-outlined dd-chevron">expand_more</span>
      </button>
      {#if catOpen}
        <div class="dd-menu">
          <button class="dd-item" class:active={selectedCategory === ""} onclick={() => pickCat("")}>All</button>
          {#each categories as cat}
            <button class="dd-item" class:active={selectedCategory === cat} onclick={() => pickCat(cat)}>{cat}</button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="dd-wrap">
      <button class="dd-trigger" onclick={() => { scoreOpen = !scoreOpen; catOpen = false; }}>
        <span class="dd-label">Min score</span>
        <span class="dd-value">{scoreLabel}</span>
        <span class="material-symbols-outlined dd-chevron">expand_more</span>
      </button>
      {#if scoreOpen}
        <div class="dd-menu">
          {#each [0, 10, 20, 30, 40, 50] as s}
            <button class="dd-item" class:active={minScore === s} onclick={() => pickScore(s)}>
              {#if s === 0}Any{:else}{s}+{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if status === "fetching" || status === "waking"}
    <div class="status-box">
      <span class="material-symbols-outlined status-icon spin">progress_activity</span>
      {#if status === "waking"}
        <p class="status-text">Server is waking up...</p>
        <p class="status-sub">Free tier backend takes ~30s on first request</p>
      {:else}
        <p class="status-text">Loading protocols...</p>
      {/if}
    </div>
  {:else if status === "error"}
    <div class="status-box error">
      <span class="material-symbols-outlined status-icon">error</span>
      <p class="status-text">{errorMsg}</p>
      <button class="retry-btn" onclick={loadProtocols}>Try Again</button>
    </div>
  {:else if status === "success"}
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
            {#each (protocol.use_cases || []).slice(0, 2) as uc}
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
  .explore-subtitle {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0;
  }

  .filters {
    display: flex;
    gap: 6px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    align-items: center;
  }
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 200px;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    padding: 0 10px;
  }
  .search-wrap:focus-within {
    border-color: var(--accent);
  }
  .search-wrap .search-icon {
    font-size: 18px;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .search-wrap .search-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 6px 0;
    font-size: 13px;
    color: var(--text);
    outline: none;
    font-family: var(--sans);
  }
  .search-wrap .search-input::placeholder {
    color: var(--text-muted);
  }
  .search-clear {
    display: flex;
    align-items: center;
    border: none;
    background: none;
    cursor: pointer;
    padding: 2px;
    color: var(--text-muted);
  }
  .search-clear .material-symbols-outlined {
    font-size: 16px;
  }
  .dd-wrap {
    position: relative;
  }
  .dd-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    color: var(--text);
    font-family: var(--sans);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s;
    white-space: nowrap;
  }
  .dd-trigger:hover {
    border-color: var(--accent);
  }
  .dd-label {
    color: var(--text-muted);
    font-weight: 500;
  }
  .dd-value {
    font-weight: 600;
    color: var(--accent);
  }
  .dd-chevron {
    font-size: 16px;
    color: var(--text-muted);
    transition: transform 0.15s;
  }
  .dd-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    min-width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0;
    z-index: 50;
    padding: 2px 0;
  }
  .dd-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 12px;
    border: none;
    border-radius: 0;
    background: none;
    color: var(--text);
    font-family: var(--sans);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.1s;
    white-space: nowrap;
  }
  .dd-item:hover {
    background: var(--surface-hover);
  }
  .dd-item.active {
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

  .status-box {
    text-align: center;
    padding: 64px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .status-icon {
    font-size: 40px;
    color: var(--accent);
  }
  .status-box.error .status-icon {
    color: var(--rose);
  }
  .status-text {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0;
  }
  .status-sub {
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
