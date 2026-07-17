<script>
  import { navigate } from "../lib/router.svelte.js";
  import { getProtocols } from "../lib/api.js";

  let searchQuery = $state("");
  let protocols = $state([]);

  $effect(() => {
    getProtocols().then((data) => { protocols = data; }).catch(() => {});
  });

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
    <p class="research-subtitle">Find and analyze any protocol on Monad</p>
  </div>
</section>

<div class="floating-search">
  <div class="search-bar">
    <span class="material-symbols-outlined search-icon">search</span>
    <input
      type="text"
      class="search-input"
      placeholder="Search a protocol..."
      bind:value={searchQuery}
      onkeydown={handleKeydown}
    />
    <button class="search-btn" onclick={handleSearch} aria-label="Search">
      <span class="material-symbols-outlined">arrow_forward</span>
    </button>
  </div>
</div>

<style>
  .research-page {
    min-height: 100vh;
    background: var(--bg);
  }
  .research-inner {
    padding: 64px 32px 48px;
    text-align: center;
  }
  .research-title {
    font-size: clamp(48px, 10vw, 160px);
    font-weight: 900;
    color: var(--text);
    margin: 0 0 16px;
    letter-spacing: -1.5px;
    line-height: 1.1;
  }
  .research-subtitle {
    font-size: 22.5px;
    color: var(--text);
    margin: 0;
  }
  @media (min-width: 641px) {
    .research-title {
      font-size: calc(clamp(48px, 10vw, 160px) * 0.65);
    }
    .research-subtitle {
      font-size: 18px;
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
  .search-bar {
    display: flex;
    align-items: center;
    background: var(--surface);
    border: none;
    border-radius: 0;
    padding: 0 0 0 14px;
    box-shadow: var(--shadow-lg);
  }
  .search-bar:focus-within {
    border-color: var(--accent);
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
  }
</style>
