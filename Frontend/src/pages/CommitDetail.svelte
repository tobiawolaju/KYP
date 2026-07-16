<script>
  import { useLocation } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import CommitGraph from "../lib/CommitGraph.svelte";
  import { commitments, protocols, activityEvents } from "../data/dummyData.js";

  let location = useLocation();
  let id = $derived(location.pathname.split("/").pop());
  let commitment = $derived(commitments.find((c) => c.id === id));
  let protocol = $derived(protocols.find((p) => p.id === commitment?.protocol_id));
  let events = $derived(activityEvents.filter((e) => e.commitment_id === commitment?.id));

  function statusColor(status) {
    if (status === "verified") return "var(--blue)";
    if (status === "slashed") return "var(--rose)";
    return "var(--amber)";
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

{#if commitment && protocol}
  <div class="commit-detail">
    <Link to="/dashboard" class="back-link">← Dashboard</Link>

    <div class="detail-header">
      <h1 class="detail-title">{protocol.name}</h1>
      <span class="detail-status" style="color: {statusColor(commitment.status)}">
        {commitment.status}
      </span>
    </div>

    <div class="detail-meta">
      <div class="meta-item">
        <span class="meta-label">Staked</span>
        <span class="meta-value">{formatWei(commitment.staked_amount)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Committed</span>
        <span class="meta-value">{formatTimestamp(commitment.commit_timestamp)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Deadline</span>
        <span class="meta-value" style="color: {commitment.status === 'active' ? 'var(--amber)' : 'var(--text-muted)'}">
          {formatTimestamp(commitment.verify_deadline)}
          {#if commitment.status === 'active'}
            <span class="deadline-countdown">({deadlineStatus(commitment.verify_deadline)})</span>
          {/if}
        </span>
      </div>
    </div>

    <div class="graph-section">
      <h3 class="section-label">Activity Timeline</h3>
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
      <Link to={`/protocol/${protocol.id}`} class="action-btn secondary">View Protocol Profile</Link>
    </div>
  </div>
{:else}
  <div class="not-found">
    <h2>Commitment not found</h2>
    <Link to="/dashboard" class="back-link">← Dashboard</Link>
  </div>
{/if}

<style>
  .commit-detail {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  :global(.back-link) {
    color: var(--accent);
    text-decoration: none;
    font-size: 14px;
    display: inline-block;
    margin-bottom: 24px;
  }
  :global(.back-link:hover) {
    opacity: 0.8;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 12px;
  }
  .detail-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }
  .detail-status {
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 6px;
    background: var(--surface);
    border: 1px solid currentColor;
  }

  .detail-meta {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 32px;
  }
  .meta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .meta-label {
    font-size: 14px;
    color: var(--text-muted);
  }
  .meta-value {
    font-family: var(--mono);
    font-size: 14px;
    color: var(--text);
    text-align: right;
  }
  .deadline-countdown {
    font-family: var(--sans);
    font-size: 13px;
    color: var(--amber);
    display: block;
    margin-top: 2px;
  }

  .graph-section {
    margin-bottom: 32px;
  }
  .graph-strip {
    margin-bottom: 24px;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .section-label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin: 0 0 16px;
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
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  :global(.action-btn:hover) {
    opacity: 0.9;
  }
  :global(.action-btn.secondary) {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
  }

  .not-found {
    padding: 64px 24px;
    text-align: center;
  }
  .not-found h2 {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
</style>
