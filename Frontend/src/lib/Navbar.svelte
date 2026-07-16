<script>
  import Link from "./Link.svelte";
  import { useLocation } from "./router.svelte.js";

  let location = useLocation();
  let drawerOpen = $state(false);

  let isHome = $derived(location.pathname === "/");
  let showBackButton = $derived(!isHome);

  function goBack() {
    window.history.back();
  }

  function toggleDrawer() {
    drawerOpen = !drawerOpen;
  }

  function closeDrawer() {
    drawerOpen = false;
  }
</script>

<nav class="navbar">
  {#if showBackButton}
    <button class="logo back-logo" onclick={goBack} aria-label="Go back">
      <span class="material-symbols-outlined">arrow_back</span>
    </button>
  {:else}
    <Link to="/" class="logo">KYP</Link>
  {/if}
  <div class="desktop-links">
    <Link to="/research" class="nav-link">Research</Link>
    <Link to="/protocols" class="nav-link">Explore</Link>
    <Link to="/dashboard" class="nav-link">Dashboard</Link>
  </div>
  <button class="hamburger" onclick={toggleDrawer} aria-label="Menu">
    <span class="material-symbols-outlined">menu</span>
  </button>
</nav>

{#if drawerOpen}
  <div class="drawer-overlay" onclick={closeDrawer} role="presentation">
    <div class="drawer" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === "Escape") closeDrawer(); }} role="dialog" tabindex="-1">
      <div class="drawer-header">
        <span class="drawer-logo">KYP</span>
        <button class="close-btn" onclick={closeDrawer} aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="drawer-links">
        <Link to="/research" class="drawer-link" onclick={closeDrawer}>Research</Link>
        <Link to="/protocols" class="drawer-link" onclick={closeDrawer}>Explore</Link>
        <Link to="/dashboard" class="drawer-link" onclick={closeDrawer}>Dashboard</Link>
      </div>
    </div>
  </div>
{/if}

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  :global(.logo) {
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 700;
    color: var(--accent);
    text-decoration: none;
    letter-spacing: -0.5px;
  }
  :global(.logo:hover) {
    opacity: 0.85;
  }
  .back-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    transition: background 0.2s;
  }
  .back-logo:hover {
    background: var(--surface);
  }
  .back-logo .material-symbols-outlined {
    font-size: 24px;
  }
  .desktop-links {
    display: flex;
    gap: 24px;
  }
  :global(.nav-link) {
    color: var(--text);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    transition: color 0.2s;
  }
  :global(.nav-link:hover) {
    opacity: 0.7;
  }
  :global(.nav-link.active) {
    color: var(--accent);
  }
  .hamburger {
    display: none;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    padding: 4px;
  }
  .hamburger .material-symbols-outlined {
    font-size: 28px;
  }

  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 200;
  }
  .drawer {
    position: fixed;
    inset: 0;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    padding: 20px 32px;
    z-index: 201;
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 48px;
  }
  .drawer-logo {
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: -0.5px;
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    padding: 4px;
  }
  .close-btn .material-symbols-outlined {
    font-size: 28px;
  }
  .drawer-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  :global(.drawer-link) {
    display: block;
    padding: 16px 0;
    font-size: 20px;
    font-weight: 500;
    color: var(--text);
    text-decoration: none;
    border-bottom: 1px solid var(--border);
    transition: color 0.2s;
  }
  :global(.drawer-link:hover) {
    color: var(--accent);
  }

  @media (max-width: 768px) {
    .desktop-links {
      display: none;
    }
    .hamburger {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
