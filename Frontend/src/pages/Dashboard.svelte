<script>
  import Link from "../lib/Link.svelte";
  import CommitGraph from "../lib/CommitGraph.svelte";
  import { getWallet } from "../lib/wallet.svelte.js";
  import { protocols, commitments, favorites, activityEvents } from "../data/dummyData.js";

  let wallet = getWallet();

  const redactChars = [".", ":"];
  function redact(len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += redactChars[Math.floor(Math.random() * redactChars.length)];
    }
    return s;
  }

  function handleDisconnect() {
    wallet.logout?.();
  }

  let favoriteProtocols = $derived(
    favorites.map((fav) => {
      let proto = protocols.find((p) => p.id === fav.protocol_id);
      let commit = commitments.find((c) => c.protocol_id === fav.protocol_id);
      let events = commit ? activityEvents.filter((e) => e.commitment_id === commit.id) : [];
      return { ...fav, protocol: proto, commitment: commit, events };
    })
  );

  let activeCommitments = $derived(commitments.filter((c) => c.status === "active"));

  let totalStaked = $derived(
    activeCommitments.reduce((sum, c) => sum + Number(c.staked_amount) / 1e18, 0)
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

  let slashOnlyDays = $derived(
    (() => {
      let days = new Set();
      for (let evt of activityEvents) {
        if (evt.event_type === "slash") {
          let day = normalize(evt.timestamp).getTime();
          let hasOther = activityEvents.some(
            (e) => e.event_type !== "slash" && normalize(e.timestamp).getTime() === day
          );
          if (!hasOther) days.add(day);
        }
      }
      return days;
    })()
  );

  let currentStreak = $derived(
    (() => {
      let check = normalize(new Date(today));
      let streak = 0;
      while (true) {
        let time = check.getTime();
        if (daysWithActivity.has(time)) {
          streak++;
        } else if (!slashOnlyDays.has(time)) {
          break;
        }
        check.setDate(check.getDate() - 1);
      }
      return streak;
    })()
  );

  let longestStreak = $derived(
    (() => {
      if (daysWithActivity.size === 0) return 0;
      let sortedDays = [...daysWithActivity.keys()].sort((a, b) => a - b);
      let best = 0;
      let curStreak = 0;
      let minDay = sortedDays[0];
      let maxDay = sortedDays[sortedDays.length - 1];
      let cur = new Date(minDay);
      while (cur.getTime() <= maxDay) {
        let time = cur.getTime();
        if (daysWithActivity.has(time)) {
          curStreak++;
          if (curStreak > best) best = curStreak;
        } else if (!slashOnlyDays.has(time)) {
          curStreak = 0;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return best;
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
    return "empty";
  }

  function gridTitle(day) {
    let ds = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!wallet.authenticated) return ds + " — No activity";
    let time = normalize(day).getTime();
    if (daysWithActivity.has(time)) return ds + " — Activity";
    if (daysWithSlash.has(time)) return ds + " — Slash";
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
    return "var(--amber)";
  }

  function statusBg(status) {
    if (status === "verified") return "var(--blue-bg)";
    if (status === "slashed") return "var(--rose-bg)";
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
  <div class="dash-header">
    <div class="dash-title-group">
      <h1 class="dash-title">My Protocols</h1>
    </div>
    {#if wallet.authenticated}
      <button class="disconnect-btn" onclick={handleDisconnect} aria-label="Disconnect Wallet">
        <span class="material-symbols-outlined">logout</span>
      </button>
    {:else}
      <button class="login-btn" onclick={() => wallet.login?.()} aria-label="Login">
        <span class="material-symbols-outlined">account_balance_wallet</span>
        Connect Wallet
      </button>
    {/if}
  </div>

  <div class="summary-section">
    <div class="summary-cards">
      <div class="summary-card">
        <span class="summary-label">Wallet</span>
        <span class="summary-value mono">{wallet.authenticated ? truncate(wallet.address) : redact(12)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Total Staked</span>
        <span class="summary-value mono">{wallet.authenticated ? totalStaked.toFixed(3) + " MON" : redact(8)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Current Streak</span>
        <span class="summary-value">{wallet.authenticated ? currentStreak + " day" + (currentStreak !== 1 ? "s" : "") : redact(6)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Longest Streak</span>
        <span class="summary-value">{wallet.authenticated ? longestStreak + " day" + (longestStreak !== 1 ? "s" : "") : redact(6)}</span>
      </div>
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

  <Link to="/" class="research-fab">
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
  .disconnect-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--rose-bg);
    color: var(--rose);
    border: none;
    border-radius: 0;
    width: 45px;
    height: 40px;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .disconnect-btn:hover {
    opacity: 0.8;
  }
  .disconnect-btn .material-symbols-outlined {
    font-size: 20px;
  }
  .login-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: #000;
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--sans);
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
  }
  .login-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .login-btn .material-symbols-outlined {
    font-size: 18px;
  }

  :global(.research-fab) {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 12px 20px;
    background: var(--accent);
    color: #fff;
    border-radius: 0;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.2s, transform 0.15s;
    z-index: 50;
  }
  :global(.research-fab:hover) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  :global(.research-fab .material-symbols-outlined) {
    font-size: 18px;
  }

  .summary-section {
    margin-bottom: 32px;
  }
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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
  .summary-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .summary-icon .material-symbols-outlined {
    font-size: 20px;
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
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
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
  .grid-square.empty {
    background: var(--border-light);
  }
  .grid-legend {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 12px;
    justify-content: flex-end;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .legend-label {
    font-size: 11px;
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


  @media (max-width: 600px) {
    .summary-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .dashboard {
      padding: 24px 16px 100px;
    }
  }
</style>
