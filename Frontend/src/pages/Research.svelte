<script>
  import { navigate } from "../lib/router.svelte.js";
  import { protocols } from "../data/dummyData.js";

  let searchQuery = $state("");

  function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const matches = protocols.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
    if (matches.length === 1) {
      navigate(`/protocol/${matches[0].id}`);
    } else {
      navigate("/protocols");
    }
  }

  function handleKeydown(e) {
    if (e.key === "Enter") handleSearch();
  }
</script>

<section class="research-page">
  <div class="research-inner">
    <h1 class="research-title">Search Protocols</h1>
    <div class="search-bar">
      <input
        type="text"
        class="search-input"
        placeholder="Search for a protocol..."
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
  </div>
</section>

<style>
  .research-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 200px);
    padding: 32px;
  }
  .research-inner {
    max-width: 480px;
    width: 100%;
    text-align: center;
  }
  .research-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 24px;
  }
  .search-bar {
    display: flex;
    align-items: center;
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
    padding: 12px 0;
    font-size: 16px;
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
    width: 44px;
    height: 44px;
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
</style>
