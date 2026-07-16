<script>
  import { useLocation } from "./lib/router.svelte.js";
  import Navbar from "./lib/Navbar.svelte";
  import PrivyHost from "./lib/PrivyHost.svelte";
  import Home from "./pages/Home.svelte";
  import Research from "./pages/Research.svelte";
  import Protocol from "./pages/Protocol.svelte";
  import Explore from "./pages/Explore.svelte";
  import Dashboard from "./pages/Dashboard.svelte";
  import CommitDetail from "./pages/CommitDetail.svelte";

  let location = useLocation();
  let path = $derived(location.pathname);
  let needsWallet = $derived(
    path.startsWith("/protocol/") ||
    path === "/dashboard" ||
    path.startsWith("/dashboard/commit/")
  );
</script>

{#if needsWallet}
  <PrivyHost />
{/if}
<Navbar />
<main class="main-content">
  {#if path === "/"}
    <Home />
  {:else if path === "/Research"}
    <Research />
  {:else if path === "/protocols"}
    <Explore />
  {:else if path.startsWith("/dashboard/commit/")}
    <CommitDetail />
  {:else if path === "/dashboard"}
    <Dashboard />
  {:else if path.startsWith("/protocol/")}
    <Protocol />
  {/if}
</main>

<footer class="app-footer"></footer>

<style>
  .main-content {
    flex: 1;
  }
  .app-footer {
    height: 100px;
    background: var(--bg);
  }
</style>
