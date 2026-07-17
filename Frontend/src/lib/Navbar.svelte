<script>
  import Link from "./Link.svelte";
  import { useLocation } from "./router.svelte.js";
  import { getTheme, toggleTheme } from "./theme.svelte.js";
  import { getWallet } from "./wallet.svelte.js";

  let location = useLocation();
  let drawerOpen = $state(false);
  let theme = getTheme();
  let wallet = getWallet();

  let isHome = $derived(location.pathname === "/");
  let isMyProtocols = $derived(location.pathname === "/myprotocols");
  let showLogo = $derived(isHome || (isMyProtocols && wallet.authenticated));
  let showBackButton = $derived(!showLogo);
  let pageTitle = $derived.by(() => {
    let p = location.pathname;
    if (p === "/research") return "Research";
    if (p === "/protocols") return "Explore Protocols";
    if (p === "/myprotocols") return "My Protocols";
    if (p.startsWith("/myprotocols/commit/")) return "Commit Detail";
    if (p.startsWith("/protocol/")) return "Protocol";
    return "";
  });

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
  {#if showLogo}
    <Link to="/" class="logo">KYP</Link>
  {:else}
    <button class="back-logo" onclick={goBack} aria-label="Go back">
      <span class="material-symbols-outlined">arrow_back</span>
      {#if pageTitle}
        <span class="back-title">{pageTitle}</span>
      {/if}
    </button>
  {/if}
  <div class="desktop-links">
    <Link to="/research" class="nav-link">Research</Link>
    <Link to="/protocols" class="nav-link">Explore Protocols</Link>
    <Link to="/myprotocols" class="nav-link">My Protocols</Link>
  </div>
  <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
    <span class="material-symbols-outlined">{theme.dark ? "light_mode" : "dark_mode"}</span>
  </button>
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
        <Link to="/protocols" class="drawer-link" onclick={closeDrawer}>Explore Protocols</Link>
        <Link to="/myprotocols" class="drawer-link" onclick={closeDrawer}>My Protocols</Link>
      </div>
      <button class="drawer-theme-toggle" onclick={toggleTheme}>
        <span class="material-symbols-outlined">{theme.dark ? "light_mode" : "dark_mode"}</span>
        {theme.dark ? "Light Mode" : "Dark Mode"}
      </button>
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
    padding: 14px 32px;
    border-bottom: 1px solid var(--border-light);
    background: rgba(250, 250, 249, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  :global(.dark) .navbar {
    background: rgba(15, 15, 15, 0.85);
  }
  :global(.logo) {
    font-family: var(--display);
    font-size: 22px;
    font-weight: 700;
    color: var(--accent);
    text-decoration: none;
    letter-spacing: -0.5px;
    transition: opacity 0.2s;
  }
  :global(.logo:hover) {
    opacity: 0.8;
  }
  .back-logo {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text);
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  .back-logo:hover {
    background: var(--surface-hover);
  }
  .back-logo .material-symbols-outlined {
    font-size: 22px;
  }
  .back-title {
    font-family: var(--display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
  }
  .desktop-links {
    display: flex;
    gap: 6px;
  }
  :global(.nav-link) {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    transition: color 0.2s, background 0.2s;
  }
  :global(.nav-link:hover) {
    color: var(--text);
    background: var(--surface-hover);
  }
  :global(.nav-link.active) {
    color: var(--accent);
    background: var(--accent-bg);
  }
  .hamburger {
    display: none;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  .hamburger:hover {
    background: var(--surface-hover);
  }
  .hamburger .material-symbols-outlined {
    font-size: 22px;
  }
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  .theme-toggle:hover {
    background: var(--surface-hover);
  }
  .theme-toggle .material-symbols-outlined {
    font-size: 22px;
  }
  .drawer-theme-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 16px 12px;
    font-size: 18px;
    font-weight: 500;
    font-family: var(--sans);
    width: 100%;
    margin-top: 24px;
    border-top: 1px solid var(--border-light);
    transition: background 0.2s, color 0.2s;
  }
  .drawer-theme-toggle:hover {
    background: var(--surface-hover);
    color: var(--accent);
  }
  .drawer-theme-toggle .material-symbols-outlined {
    font-size: 22px;
  }

  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    z-index: 200;
  }
  .drawer {
    position: fixed;
    inset: 0;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    padding: 24px 32px;
    z-index: 201;
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 48px;
  }
  .drawer-logo {
    font-family: var(--display);
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
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  .close-btn:hover {
    background: var(--surface-hover);
  }
  .close-btn .material-symbols-outlined {
    font-size: 22px;
  }
  .drawer-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  :global(.drawer-link) {
    display: block;
    padding: 16px 12px;
    font-size: 18px;
    font-weight: 500;
    color: var(--text);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background 0.2s, color 0.2s;
  }
  :global(.drawer-link:hover) {
    background: var(--surface-hover);
    color: var(--accent);
  }

  @media (max-width: 768px) {
    .navbar {
      padding: 12px 20px;
    }
    .desktop-links {
      display: none;
    }
    .hamburger {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .theme-toggle {
      display: none;
    }
  }
</style>
