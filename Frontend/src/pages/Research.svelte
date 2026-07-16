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
    <div class="research-icon">
      <span class="material-symbols-outlined">science</span>
    </div>
    <h1 class="research-title">Search Protocols</h1>
    <p class="research-subtitle">Find and analyze any protocol on Monad</p>
    <div class="search-bar">
      <span class="material-symbols-outlined search-icon">search</span>
      <input
        type="text"
        class="search-input"
        placeholder="Search for a protocol..."
        bind:value={searchQuery}
        onkeydown={handleKeydown}
      />
      <button class="search-btn" onclick={handleSearch} aria-label="Search">
        <span class="material-symbols-outlined">arrow_forward</span>
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
  .research-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  .research-icon .material-symbols-outlined {
    font-size: 28px;
  }
  .research-title {
    font-size: 28px;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 6px;
    letter-spacing: -0.5px;
  }
  .research-subtitle {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0 0 28px;
  }
  .search-bar {
    display: flex;
    align-items: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 4px 4px 4px 14px;
    box-shadow: var(--shadow-sm);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-bar:focus-within {
    border-color: var(--accent);
    box-shadow: var(--shadow-md), 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  .search-icon {
    font-size: 20px;
    color: var(--text-muted);
  }
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 12px 8px;
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
