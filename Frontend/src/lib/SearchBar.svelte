<script>
  import { getProtocols } from "./api.js";
  import { getNetwork } from "./network.svelte.js";

  let { onSearch, searching = false } = $props();

  const network = getNetwork();
  let searchQuery = $state("");
  let protocols = $state([]);
  let showSuggestions = $state(false);
  let selectedIndex = $state(-1);
  let inputEl = $state(null);

  async function loadProtocols() {
    try {
      protocols = await getProtocols({ network: network.current });
    } catch {
      protocols = [];
    }
  }

  $effect(() => { network.current; loadProtocols(); });

  let suggestions = $derived(
    searchQuery.trim().length > 0
      ? protocols
          .filter((p) => p.deep_research_status === "completed")
          .filter((p) => {
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
          })
          .slice(0, 6)
      : []
  );

  $effect(() => {
    showSuggestions = suggestions.length > 0;
    selectedIndex = -1;
  });

  function handleSubmit() {
    showSuggestions = false;
    onSearch(searchQuery);
  }

  function handleKeydown(e) {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        searchQuery = suggestions[selectedIndex].name;
        showSuggestions = false;
        onSearch(suggestions[selectedIndex].name);
      } else {
        handleSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (e.key === "Escape") {
      showSuggestions = false;
    }
  }

  function pickSuggestion(name) {
    searchQuery = name;
    showSuggestions = false;
    onSearch(name);
  }

  function handleBlur() {
    setTimeout(() => { showSuggestions = false; }, 150);
  }
</script>

<div class="search-bar-wrap">
  <div class="search-bar">
    <span class="material-symbols-outlined search-icon">search</span>
    <input
      bind:this={inputEl}
      type="text"
      class="search-input"
      placeholder="Search a protocol..."
      bind:value={searchQuery}
      onkeydown={handleKeydown}
      onfocus={() => { if (suggestions.length > 0) showSuggestions = true; }}
      onblur={handleBlur}
    />
    <button class="search-btn" onclick={handleSubmit} aria-label="Search" disabled={searching}>
      {#if searching}
        <span class="material-symbols-outlined spin">progress_activity</span>
      {:else}
        <span class="material-symbols-outlined">arrow_forward</span>
      {/if}
    </button>
  </div>
  {#if showSuggestions && suggestions.length > 0}
    <div class="suggestions">
      {#each suggestions as s, i}
        <button
          class="suggestion"
          class:selected={i === selectedIndex}
          onmousedown={(e) => { e.preventDefault(); pickSuggestion(s.name); }}
        >
          <span class="suggestion-name">{s.name}</span>
          <span class="suggestion-cat">{s.category || ""}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-bar-wrap {
    position: relative;
    width: 100%;
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
  .search-btn:hover { opacity: 0.9; }
  .search-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .search-btn .material-symbols-outlined { font-size: 18px; }

  .suggestions {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    max-height: 280px;
    overflow-y: auto;
  }
  .suggestion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-size: 15px;
    font-family: var(--sans);
    transition: background 0.1s;
  }
  .suggestion:hover, .suggestion.selected {
    background: var(--surface-hover);
  }
  .suggestion-name {
    font-weight: 500;
  }
  .suggestion-cat {
    font-size: 13px;
    color: var(--text-muted);
  }

  @media (min-width: 641px) {
    .search-btn {
      width: 5vw;
      height: 5vw;
    }
    .search-bar {
      height: 5vw;
    }
  }
</style>
