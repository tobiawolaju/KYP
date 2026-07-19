<script>
  import Link from "../lib/Link.svelte";
  import CommitGraph from "../lib/CommitGraph.svelte";
  import { getWallet } from "../lib/wallet.svelte.js";
  import { getProtocols, getFavorites } from "../lib/api.js";
  import { fetchCommitments } from "../lib/api.js";

  let wallet = getWallet();
  let commitments = $state([]);
  let loading = $state(false);
  let protocols = $state([]);
  let favorites = $state([]);

  $effect(() => {
    getProtocols().then((data) => { protocols = data; }).catch(() => {});
  });

  $effect(() => {
    if (wallet.authenticated && wallet.address) {
      loading = true;
      Promise.all([
        fetchCommitments(wallet.address),
        getFavorites(wallet.address),
      ])
        .then(([commitData, favData]) => { commitments = commitData; favorites = favData; })
        .catch((err) => { console.error("Failed to load data:", err); })
        .finally(() => { loading = false; });
    } else {
      commitments = [];
      favorites = [];
    }
  });

  let activityEvents = $derived(
    commitments.flatMap((c) => {
      let events = [{ commitment_id: c.id, event_type: "stake", timestamp: c.commit_timestamp }];
      if (c.status === "verified") {
        events.push({ commitment_id: c.id, event_type: "verify", timestamp: c.verified_at || c.commit_timestamp });
      } else if (c.status === "slashed") {
        events.push({ commitment_id: c.id, event_type: "slash", timestamp: c.last_check_at || c.commit_timestamp });
      }
      if (c.missed_count > 0) {
        for (let i = 0; i < c.missed_count; i++) {
          events.push({ commitment_id: c.id, event_type: "check_missed", timestamp: c.last_check_at || c.commit_timestamp });
        }
      }
      return events;
    })
  );

  const redactChars = [".", ":"];
  function redact(len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += redactChars[Math.floor(Math.random() * redactChars.length)];
    }
    return s;
  }

  function handleAuthAction() {
    if (!wallet.ready) return;
    if (wallet.authenticated) {
      wallet.logout?.();
      return;
    }
    wallet.login?.();
  }

  let favoriteProtocols = $derived(
    favorites.map((fav) => {
      let proto = protocols.find((p) => p.id === fav.protocol_id);
      let commit = commitments.find((c) => c.protocol_id === fav.protocol_id);
      let events = commit ? activityEvents.filter((e) => e.commitment_id === commit.id) : [];
      return { ...fav, protocol: proto, commitment: commit, events };
    })
  );

  function normalize(d) {
    let dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  let today = $derived(normalize(new Date()));

  let daysWithActivity = $derived(
    (() => {
      let days = new Map();
      for (let evt of activityEvents) {
        if (evt.event_type === "slash") continue;
        let key = normalize(evt.timestamp).getTime();
        days.set(key, (days.get(key) || 0) + 1);
      }
      return days;
    })()
  );

  let daysWithSlash = $derived(
    (() => {
      let days = new Set();
      for (let evt of activityEvents) {
        if (evt.event_type === "slash") {
          days.add(normalize(evt.timestamp).getTime());
        }
      }
      return days;
    })()
  );

  let daysWithMissedCheck = $derived(
    (() => {
      let days = new Set();
      for (let evt of activityEvents) {
        if (evt.event_type === "check_missed") {
          days.add(normalize(evt.timestamp).getTime());
        }
      }
      return days;
    })()
  );

  function truncate(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  }

  let gridDays = $derived(
    (() => {
      let days = [];
      let start = new Date(today);
      start.setDate(start.getDate() - 29);
      let cur = new Date(start);
      while (cur <= today) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return days;
    })()
  );

  function gridColor(day) {
    if (!wallet.authenticated) return "empty";
    let time = normalize(day).getTime();
    if (daysWithActivity.has(time)) return "event";
    if (daysWithSlash.has(time)) return "slash";
    if (daysWithMissedCheck.has(time)) return "missed";
    return "empty";
  }

  function gridTitle(day) {
    let ds = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!wallet.authenticated) return ds + " — No activity";
    let time = normalize(day).getTime();
    if (daysWithActivity.has(time)) return ds + " — Activity";
    if (daysWithSlash.has(time)) return ds + " — Slash";
    if (daysWithMissedCheck.has(time)) return ds + " — Missed Check";
    return ds + " — No activity";
  }

  let gridWeeks = $derived(
    (() => {
      let weeks = [];
      let week = [];
      for (let day of gridDays) {
        week.push(day);
        if (week.length === 7) {
          weeks.push(week);
          week = [];
        }
      }
      if (week.length > 0) weeks.push(week);
      return weeks;
    })()
  );

  function statusColor(status) {
    if (status === "verified") return "var(--blue)";
    if (status === "slashed") return "var(--rose)";
    if (status === "withdrawn") return "var(--pink)";
    return "var(--amber)";
  }

  function statusBg(status) {
    if (status === "verified") return "var(--blue-bg)";
    if (status === "slashed") return "var(--rose-bg)";
    if (status === "withdrawn") return "#FCE7F3";
    return "var(--amber-bg)";
  }

  function formatTimestamp(ts) {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatWei(wei) {
    return (Number(wei) / 1e18).toFixed(2) + " MON";
  }
</script>

<div class="dashboard">
  

  {#if !wallet.ready}
    <div class="loading-state">
      <span class="material-symbols-outlined loading-icon">hourglass_top</span>
      <p>Checking wallet session...</p>
    </div>
  {:else if loading}
    <div class="loading-state">
      <span class="material-symbols-outlined loading-icon">hourglass_top</span>
      <p>Loading commitments...</p>
    </div>
  {/if}

  <div class="summary-section">
    <div class="summary-cards">
      <div class="summary-card">
        <span class="summary-label">Account</span>
        <span class="summary-value mono">{wallet.authenticated ? truncate(wallet.address) : redact(12)}</span>
      </div>
      <button
        class="summary-card auth-card"
        class:authenticated={wallet.authenticated}
        onclick={handleAuthAction}
        disabled={!wallet.ready}
        aria-label={wallet.ready ? (wallet.authenticated ? "Logout" : "Login") : "Checking wallet session"}
      >
        <span class="summary-label">{wallet.ready ? (wallet.authenticated ? "Logout" : "Login") : "Connecting"}</span>
        <span class="summary-value mono">{wallet.ready ? (wallet.authenticated ? "Disconnect wallet" : "Connect Wallet") : "Please wait"}</span>
      </button>
    </div>
  </div>

  <div class="activity-section">
    <h2 class="section-title">Activity (Last 30 Days)</h2>
    <div class="activity-grid-wrapper">
      <div class="activity-grid">
        {#each gridWeeks as week}
          <div class="grid-week">
            {#each week as day}
              <span class="grid-square {gridColor(day)}" title={gridTitle(day)}></span>
            {/each}
          </div>
        {/each}
      </div>
      <div class="grid-legend">
        <div class="legend-item">
          <span class="grid-square empty"></span>
          <span class="legend-label">No activity</span>
        </div>
        <div class="legend-item">
          <span class="grid-square event"></span>
          <span class="legend-label">Activity</span>
        </div>
        <div class="legend-item">
          <span class="grid-square missed"></span>
          <span class="legend-label">Missed Check</span>
        </div>
        <div class="legend-item">
          <span class="grid-square slash"></span>
          <span class="legend-label">Slash</span>
        </div>
      </div>
    </div>
  </div>

  <div class="favorites-section">
    <h2 class="section-title">My Protocols | {favorites.length} favourite | Committed to {commitments.length}</h2>
    <div class="favorites-list">
      {#each favoriteProtocols as entry}
        <div class="fav-card">
          <div class="fav-card-top">
            <div class="fav-info">
              {#if entry.protocol?.image}
                <img src={entry.protocol.image} alt={entry.protocol.name} class="fav-logo" />
              {/if}
              <div class="fav-text">
                <Link to={`/protocol/${entry.protocol_id}`} class="fav-name">
                  {entry.protocol?.name ?? "Unknown Protocol"}
                </Link>
                <span class="fav-date">Favorited {formatTimestamp(entry.favorited_at)}</span>
              </div>
            </div>
            {#if entry.auto_favorited}
              <span class="auto-badge">auto</span>
            {/if}
          </div>

          {#if entry.commitment}
            <div class="commit-section">
              <div class="commit-meta">
                <span class="commit-status-badge" style="background: {statusBg(entry.commitment.status)}; color: {statusColor(entry.commitment.status)};">
                  {entry.commitment.status}
                </span>
                <span class="commit-amount">{formatWei(entry.commitment.staked_amount)}</span>
                <span class="commit-deadline">due {formatTimestamp(entry.commitment.verify_deadline)}</span>
              </div>

              {#if entry.commitment.status === "active" && entry.commitment.missed_count > 0}
                <div class="strike-indicator">
                  <span class="strike-label">Strikes:</span>
                  <span class="strike-dots">
                    {#each Array(3) as _, i}
                      <span class="strike-dot" class:missed={i < entry.commitment.missed_count}></span>
                    {/each}
                  </span>
                  <span class="strike-count">{entry.commitment.missed_count}/3</span>
                </div>
              {/if}

              <Link to={`/myprotocols/commit/${entry.commitment.id}`} class="commit-graph-link">
                <CommitGraph
                  events={entry.events}
                  size="mini"
                  startDate={entry.commitment.commit_timestamp}
                  endDate={entry.commitment.verify_deadline}
                  status={entry.commitment.status}
                />
              </Link>
            </div>
          {:else}
            <div class="no-commit">
              <span class="no-commit-text">Not yet committed</span>
              <Link to={`/protocol/${entry.protocol_id}`} class="commit-link">Commit →</Link>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <Link to="/research" class="research-fab">
    <span class="material-symbols-outlined">add</span>
    Research New Protocol
  </Link>
</div>

<style>
  .dashboard {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 24px 100px;
  }
  .dash-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    gap: 16px;
    flex-wrap: wrap;
  }
  .dash-title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dash-title {
    font-size: 16px;
    font-weight: 800;
    margin: 0;
    color: var(--text);
    letter-spacing: -0.5px;
  }
  .dash-subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
  }
  .auth-card {
    width: 100%;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    border-color: var(--accent);
  }


.auth-card.authenticated {
  border-color: color-mix(in srgb, var(--rose) 50%, transparent);
}

  .auth-card:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }


.auth-card.authenticated:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--rose) 50%, transparent);
}


  .auth-card:disabled {
    cursor: wait;
    opacity: 0.75;
  }
  .auth-card:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .loading-state {
    text-align: center;
    padding: 40px 24px;
    color: var(--text-muted);
  }
  .loading-icon {
    font-size: 32px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  :global(.research-fab) {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0;
    height: 20vw;
    background: #5D2CB2;
    color: #fff;
    border: none;
    border-radius: 0;
    font-family: var(--sans);
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    z-index: 50;
  }
  :global(.research-fab:hover) {
    opacity: 0.9;
  }
  :global(.research-fab .material-symbols-outlined) {
    font-size: 18px;
  }

  .summary-section {
    margin-bottom: 32px;
  }
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .summary-card:hover {
    border-color: var(--border);
    box-shadow: var(--shadow-sm);
  }
  .summary-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted);
  }
  .summary-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }
  .summary-value.mono {
    font-family: var(--mono);
    font-size: 14px;
    letter-spacing: -0.3px;
  }

  .activity-section {
    margin-bottom: 32px;
  }
  .section-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 14px;
    color: var(--text);
  }
  .activity-grid-wrapper {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 20px;
  }
  .activity-grid {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .grid-week {
    display: flex;
    gap: 4px;
  }
  .grid-square {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    flex-shrink: 0;
    transition: transform 0.15s;
  }
  .grid-square:hover {
    transform: scale(1.3);
  }
  .grid-square.event {
    background: var(--accent);
  }
  .grid-square.slash {
    background: var(--rose);
  }
  .grid-square.missed {
    background: var(--amber);
  }
  .grid-square.empty {
    background: var(--border-light);
  }
  .grid-legend {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 6px;
  }
  .legend-item .grid-square {
    width: 7px;
    height: 7px;
  }
  .legend-label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .favorites-section {
    border-top: 1px solid var(--border-light);
    padding-top: 32px;
  }

  .favorites-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .fav-card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .fav-card:hover {
    border-color: var(--border);
    box-shadow: var(--shadow-sm);
  }
  .fav-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .fav-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fav-logo {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
  }
  .fav-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  :global(.fav-name) {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }
  :global(.fav-name:hover) {
    color: var(--accent);
  }
  .fav-date {
    font-size: 12px;
    color: var(--text-muted);
  }
  .auto-badge {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-full);
    background: var(--accent-bg);
    color: var(--accent);
    font-family: var(--mono);
    text-transform: uppercase;
    font-weight: 600;
  }

  .commit-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .commit-meta {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .commit-status-badge {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    letter-spacing: 0.3px;
  }
  .commit-amount {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
  }
  .commit-deadline {
    font-size: 13px;
    color: var(--text-muted);
  }
  .strike-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .strike-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .strike-dots {
    display: flex;
    gap: 4px;
  }
  .strike-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-light);
  }
  .strike-dot.missed {
    background: var(--rose);
  }
  .strike-count {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--rose);
    font-weight: 600;
  }
  :global(.commit-graph-link) {
    display: inline-flex;
    text-decoration: none;
    padding: 4px 0;
  }
  :global(.commit-graph-link:hover .square) {
    transform: scale(1.25);
  }
  :global(.commit-graph-link .square) {
    transition: transform 0.15s;
    cursor: pointer;
  }

  .no-commit {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .no-commit-text {
    font-size: 14px;
    color: var(--text-muted);
    font-style: italic;
  }
  :global(.commit-link) {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
  }
  :global(.commit-link:hover) {
    opacity: 0.8;
  }


  @media (min-width: 641px) {
    :global(.research-fab) {
      height: 5vw;
    }
  }

  @media (max-width: 600px) {
    .summary-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .dashboard {
      padding: 24px 16px 100px;
    }
  }
</style>
