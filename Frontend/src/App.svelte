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
</script>

<PrivyHost />
<Navbar />
<main class="main-content">
  {#if path === "/"}
    <Home />
  {:else if path === "/research"}
    <Research />
  {:else if path === "/protocols"}
    <Explore />
  {:else if path.startsWith("/myprotocols/commit/")}
    <CommitDetail />
  {:else if path === "/myprotocols"}
    <Dashboard />
  {:else if path.startsWith("/protocol/")}
    <Protocol />
  {/if}
</main>



<style>
  .main-content {
    flex: 1;
  }

</style>
