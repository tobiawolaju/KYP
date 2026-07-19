<script>
  import { navigate } from "../lib/router.svelte.js";
  import { flashResearch } from "../lib/api.js";
  import { getNetwork } from "../lib/network.svelte.js";
  import SearchBar from "../lib/SearchBar.svelte";

  const network = getNetwork();
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

<section class="research-page">
  <div class="research-inner">
    <h1 class="research-title">Search Protocols</h1>
    <p class="research-subtitle">Find and analyze any protocol on Monad</p>
  </div>
</section>

<div class="floating-search">
  <SearchBar onSearch={handleSearch} {searching} />
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

</style>
