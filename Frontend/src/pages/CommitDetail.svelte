<script>
  import { useLocation } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import CommitGraph from "../lib/CommitGraph.svelte";
  import { getProtocol, fetchCommitment } from "../lib/api.js";

  let location = useLocation();
  let id = $derived(location.pathname.split("/").pop());
  let commitment = $state(null);
  let protocol = $state(null);
  let loading = $state(true);
  let error = $state("");

  $effect(() => {
    if (id) {
      loading = true;
      error = "";
      protocol = null;
      fetchCommitment(id)
        .then((data) => {
          commitment = data;
          if (data?.protocol_id) {
            return getProtocol(data.protocol_id);
          }
        })
        .then((proto) => { if (proto) protocol = proto; })
        .catch((err) => { error = err.message || "Failed to load commitment"; })
        .finally(() => { loading = false; });
    }
  });

  let events = $derived(
    commitment ? (() => {
      let evts = [{ commitment_id: commitment.id, event_type: "stake", timestamp: commitment.commit_timestamp }];
      if (commitment.status === "verified") {
        evts.push({ commitment_id: commitment.id, event_type: "verify", timestamp: commitment.verified_at || commitment.commit_timestamp });
      } else if (commitment.status === "slashed") {
        evts.push({ commitment_id: commitment.id, event_type: "slash", timestamp: commitment.last_check_at || commitment.commit_timestamp });
      }
      if (commitment.missed_count > 0) {
        for (let i = 0; i < commitment.missed_count; i++) {
          evts.push({ commitment_id: commitment.id, event_type: "check_missed", timestamp: commitment.last_check_at || commitment.commit_timestamp });
        }
      }
      return evts;
    })() : []
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
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatWei(wei) {
    return (Number(wei) / 1e18).toFixed(4) + " MON";
  }

  function eventMeta(eventType) {
    if (eventType === "stake") return { label: "Stake", icon: "S", color: "var(--amber)" };
    if (eventType === "verify") return { label: "Verify", icon: "V", color: "var(--accent)" };
    if (eventType === "slash") return { label: "Slash", icon: "X", color: "var(--rose)" };
    if (eventType === "check_missed") return { label: "Missed Check", icon: "!", color: "var(--amber)" };
    return { label: eventType, icon: "?", color: "var(--text-muted)" };
  }

  function deadlineStatus(deadline) {
    let diff = new Date(deadline) - new Date();
    if (diff <= 0) return "passed";
    let hours = Math.floor(diff / 3600000);
    let days = Math.floor(hours / 24);
    return days > 0 ? `${days}d ${hours % 24}h remaining` : `${hours}h remaining`;
  }
</script>

{#if loading}
  <div class="not-found">
    <span class="material-symbols-outlined not-found-icon" style="animation: spin 1s linear infinite;">hourglass_top</span>
    <h2>Loading commitment...</h2>
  </div>
{:else if error}
  <div class="not-found">
    <span class="material-symbols-outlined not-found-icon">error</span>
    <h2>{error}</h2>
    <Link to="/myprotocols" class="back-link">← My Protocols</Link>
  </div>
{:else if commitment && protocol}
  <div class="commit-detail">
    <div class="detail-header">
      <div class="detail-header-left">
        {#if protocol.image}
          <img src={protocol.image} alt={protocol.name} class="detail-logo" />
        {/if}
        <div class="detail-title-group">
          <h1 class="detail-title">{protocol.name}</h1>
          <span class="commit-id">#{commitment.id}</span>
        </div>
      </div>
      <span class="status-badge" style="background: {statusBg(commitment.status)}; color: {statusColor(commitment.status)};">
        {commitment.status}
      </span>
    </div>

    {#if commitment.status === "active" && commitment.missed_count > 0}
      <div class="strike-section">
        <span class="strike-label">Verification Checks:</span>
        <div class="strike-dots">
          {#each Array(3) as _, i}
            <span class="strike-dot" class:missed={i < commitment.missed_count}></span>
          {/each}
        </div>
        <span class="strike-count">{commitment.missed_count}/3 missed</span>
      </div>
    {/if}

    <div class="detail-meta">
      <div class="meta-item">
        <div class="meta-icon" style="background: var(--green-bg); color: var(--green);">
          <span class="material-symbols-outlined">stacks</span>
        </div>
        <div class="meta-content">
          <span class="meta-label">Staked</span>
          <span class="meta-value">{formatWei(commitment.staked_amount)}</span>
        </div>
      </div>
      <div class="meta-item">
        <div class="meta-icon" style="background: var(--accent-bg); color: var(--accent);">
          <span class="material-symbols-outlined">schedule</span>
        </div>
        <div class="meta-content">
          <span class="meta-label">Committed</span>
          <span class="meta-value">{formatTimestamp(commitment.commit_timestamp)}</span>
        </div>
      </div>
      <div class="meta-item">
        <div class="meta-icon" style="background: {commitment.status === 'active' ? 'var(--amber-bg)' : 'var(--surface-hover)'}; color: {commitment.status === 'active' ? 'var(--amber)' : 'var(--text-muted)'};">
          <span class="material-symbols-outlined">timer</span>
        </div>
        <div class="meta-content">
          <span class="meta-label">Deadline</span>
          <span class="meta-value">
            {formatTimestamp(commitment.verify_deadline)}
            {#if commitment.status === 'active'}
              <span class="deadline-countdown">({deadlineStatus(commitment.verify_deadline)})</span>
            {/if}
          </span>
        </div>
      </div>
    </div>

    <div class="graph-section">
      <h3 class="section-label">
        <span class="material-symbols-outlined">timeline</span>
        Activity Timeline
      </h3>
      <div class="graph-strip">
        <CommitGraph
          {events}
          size="expanded"
          startDate={commitment.commit_timestamp}
          endDate={commitment.verify_deadline}
          status={commitment.status}
          maxCells={365}
        />
      </div>
      <div class="event-flow">
        {#each events as evt, i}
          {@const meta = eventMeta(evt.event_type)}
          <div class="event-node">
            <div class="event-bubble" style="background: {meta.color}">
              {meta.icon}
            </div>
            {#if i < events.length - 1}
              <div class="event-line" style="background: {meta.color}"></div>
            {/if}
          </div>
          <div class="event-info">
            <span class="event-type" style="color: {meta.color}">{meta.label}</span>
            <span class="event-time">{formatTimestamp(evt.timestamp)}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="actions-section">
      <Link to={`/protocol/${protocol.id}`} class="action-btn">
        <span class="material-symbols-outlined">visibility</span>
        View Protocol Profile
      </Link>
    </div>
  </div>
{:else}
  <div class="not-found">
    <span class="material-symbols-outlined not-found-icon">search_off</span>
    <h2>Commitment not found</h2>
    <Link to="/myprotocols" class="back-link">← My Protocols</Link>
  </div>
{/if}

<style>
  .commit-detail {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  :global(.back-link) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 28px;
    transition: color 0.2s;
  }
  :global(.back-link:hover) {
    color: var(--text);
  }
  :global(.back-link .material-symbols-outlined) {
    font-size: 18px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    gap: 12px;
  }
  .detail-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .detail-logo {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
  }
  .detail-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .detail-title {
    font-size: 28px;
    font-weight: 800;
    margin: 0;
    color: var(--text);
    letter-spacing: -0.5px;
  }
  .commit-id {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-muted);
  }
  .status-badge {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    letter-spacing: 0.3px;
    flex-shrink: 0;
  }
  .strike-section {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
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
    gap: 6px;
  }
  .strike-dot {
    width: 10px;
    height: 10px;
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

  .detail-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 4px;
    margin-bottom: 32px;
    overflow: hidden;
  }
  .meta-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius-md);
    transition: background 0.15s;
  }
  .meta-item:hover {
    background: var(--surface-hover);
  }
  .meta-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .meta-icon .material-symbols-outlined {
    font-size: 18px;
  }
  .meta-content {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .meta-label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .meta-value {
    font-family: var(--mono);
    font-size: 14px;
    color: var(--text);
    font-weight: 500;
  }
  .deadline-countdown {
    font-family: var(--sans);
    font-size: 12px;
    color: var(--amber);
    display: block;
    margin-top: 1px;
    font-weight: 500;
  }

  .graph-section {
    margin-bottom: 32px;
  }
  .graph-strip {
    margin-bottom: 24px;
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
  }
  .section-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .section-label .material-symbols-outlined {
    font-size: 16px;
  }
  .event-flow {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .event-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 40px;
    flex-shrink: 0;
  }
  .event-bubble {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    z-index: 1;
  }
  .event-line {
    width: 2px;
    flex: 1;
    min-height: 24px;
    opacity: 0.5;
  }
  .event-node:last-child .event-line {
    display: none;
  }
  :global(.event-flow) {
    display: flex;
    flex-direction: row;
    gap: 0;
  }
  .event-info {
    padding: 4px 0 24px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .event-type {
    font-size: 15px;
    font-weight: 600;
  }
  .event-time {
    font-size: 13px;
    color: var(--text-muted);
    font-family: var(--mono);
  }

  .actions-section {
    display: flex;
    gap: 12px;
  }
  :global(.action-btn) {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  :global(.action-btn:hover) {
    border-color: var(--accent-border);
    box-shadow: var(--shadow-sm);
  }
  :global(.action-btn .material-symbols-outlined) {
    font-size: 18px;
  }

  .not-found {
    padding: 80px 24px;
    text-align: center;
  }
  .not-found-icon {
    font-size: 56px;
    color: var(--border);
    display: block;
    margin-bottom: 16px;
  }
  .not-found h2 {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
</style>
