<script>
  let { events = [], size = "mini", startDate = null, endDate = null, status = "verified", maxCells = 14 } = $props();

  function normalize(d) {
    let dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  let days = $derived(
    (() => {
      if (!startDate || !endDate) return [];
      let start = normalize(startDate);
      let end = normalize(endDate);
      if (status === "active") {
        let today = normalize(new Date());
        if (today < end) end = today;
      }
      let result = [];
      let cur = new Date(start);
      while (cur <= end) {
        result.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return result;
    })()
  );

  let visibleDays = $derived(
    days.length > maxCells ? days.slice(days.length - maxCells) : days
  );

  function dayColor(day) {
    let dayStart = normalize(day);
    let dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    let dayEvts = events.filter((e) => {
      let t = new Date(e.timestamp);
      return t >= dayStart && t < dayEnd;
    });
    if (dayEvts.length === 0) return "empty";
    if (dayEvts.some((e) => e.event_type === "slash")) return "slash";
    if (dayEvts.some((e) => e.event_type === "check_missed")) return "missed";
    return "event";
  }

  function dayTitle(day) {
    let dayStart = normalize(day);
    let dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    let dayEvts = events.filter((e) => {
      let t = new Date(e.timestamp);
      return t >= dayStart && t < dayEnd;
    });
    let ds = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dayEvts.length === 0) return ds + " — No activity";
    let labels = dayEvts.map((e) => {
      if (e.event_type === "stake") return "Stake";
      if (e.event_type === "verify") return "Verify";
      if (e.event_type === "slash") return "Slash";
      if (e.event_type === "check_missed") return "Missed Check";
      return e.event_type;
    });
    return ds + " — " + [...new Set(labels)].join(", ");
  }
</script>

<div class="commit-graph {size}">
  {#if visibleDays.length === 0}
    <span class="square empty" title="No timeline data"></span>
  {:else}
    {#each visibleDays as day}
      {@const color = dayColor(day)}
      <div class="graph-item">
        <span class="square {color}" title={dayTitle(day)}></span>
        {#if size === "expanded"}
          <span class="day-label">{day.getDate()}</span>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .commit-graph {
    display: flex;
    align-items: center;
  }
  .mini {
    gap: 2px;
  }
  .expanded {
    gap: 4px;
  }
  .graph-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .square {
    border-radius: 2px;
    flex-shrink: 0;
    cursor: default;
  }
  .mini .square {
    width: 10px;
    height: 10px;
  }
  .expanded .square {
    width: 20px;
    height: 20px;
    border-radius: 3px;
  }
  .square.event {
    background: var(--accent);
  }
  .square.slash {
    background: var(--rose);
  }
  .square.missed {
    background: var(--amber);
  }
  .square.empty {
    background: var(--border);
  }
  .expanded .square.empty {
    opacity: 0.6;
  }
  .day-label {
    font-size: 9px;
    color: var(--text-muted);
    font-family: var(--mono);
    line-height: 1;
  }
</style>
