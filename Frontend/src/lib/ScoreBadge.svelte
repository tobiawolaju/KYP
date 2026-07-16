<script>
  let { score = 0, size = "lg" } = $props();

  function tierFromScore(s) {
    if (s >= 41) return { label: "Secured", color: "var(--accent)" };
    if (s >= 31) return { label: "Solid", color: "var(--accent)" };
    if (s >= 21) return { label: "Caution", color: "var(--amber)" };
    if (s >= 11) return { label: "High risk", color: "color-mix(in srgb, var(--rose), var(--amber) 50%)" };
    return { label: "Rug potential", color: "var(--rose)" };
  }

  let tier = $derived(tierFromScore(score));
</script>

<div class="shield" style="--shield-color: {tier.color};" class:shield-sm={size === "sm"} class:shield-md={size === "md"} class:shield-lg={size === "lg"}>
  <svg viewBox="0 0 120 140" class="shield-svg">
    <path d="M60 2 L116 34 L116 78 C116 108 90 128 60 138 C30 128 4 108 4 78 L4 34 Z" class="shield-border-outer" />
    <path d="M60 8 L112 38 L112 78 C112 106 88 126 60 136 C32 126 8 106 8 78 L8 38 Z" class="shield-bg" />
    <path d="M60 8 L112 38 L112 78 C112 106 88 126 60 136 C32 126 8 106 8 78 L8 38 Z" class="shield-border" />
  </svg>
  <div class="shield-content">
    <span class="shield-score">{score}</span>
    <span class="shield-max">/50</span>
    <span class="shield-label">{tier.label}</span>
  </div>
</div>

<style>
  .shield {
    position: relative;
    flex-shrink: 0;
    transform: rotate(-6deg);
  }
  .shield-lg {
    width: 104px;
    height: 124px;
  }
  .shield-md {
    width: 78px;
    height: 93px;
  }
  .shield-sm {
    width: 52px;
    height: 62px;
  }
  .shield-svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .shield-bg {
    fill: color-mix(in srgb, var(--shield-color) 14%, transparent);
  }
  .shield-border {
    fill: none;
    stroke: var(--shield-color);
    stroke-width: 3;
  }
  .shield-border-outer {
    fill: none;
    stroke: var(--shield-color);
    stroke-width: 2;
    opacity: 0.4;
  }
  .shield-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding-top: 4px;
  }
  .shield-lg .shield-content {
    gap: 2px;
    padding-top: 4px;
  }
  .shield-md .shield-content {
    gap: 1px;
    padding-top: 2px;
  }
  .shield-sm .shield-content {
    gap: 0px;
    padding-top: 0px;
  }
  .shield-score {
    font-weight: 700;
    font-family: var(--mono);
    color: var(--shield-color);
    line-height: 1;
  }
  .shield-lg .shield-score {
    font-size: 32px;
  }
  .shield-md .shield-score {
    font-size: 24px;
  }
  .shield-sm .shield-score {
    font-size: 16px;
  }
  .shield-max {
    font-family: var(--mono);
    color: var(--text-muted);
    line-height: 1;
  }
  .shield-lg .shield-max {
    font-size: 14px;
  }
  .shield-md .shield-max {
    font-size: 11px;
  }
  .shield-sm .shield-max {
    font-size: 8px;
  }
  .shield-label {
    font-weight: 700;
    color: #fff;
    background: var(--shield-color);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1;
    border-radius: 3px;
  }
  .shield-lg .shield-label {
    font-size: 10px;
    padding: 2px 6px;
    margin-top: 4px;
  }
  .shield-md .shield-label {
    font-size: 8px;
    padding: 2px 5px;
    margin-top: 2px;
  }
  .shield-sm .shield-label {
    font-size: 6px;
    padding: 1px 4px;
    margin-top: 0px;
  }
</style>
