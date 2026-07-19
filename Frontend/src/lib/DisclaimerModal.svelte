<script>
  let { onAgree } = $props();
  let checked = $state(false);
  let visible = $state(false);

  $effect(() => {
    const agreed = localStorage.getItem("kyp_disclaimer_agreed");
    if (!agreed) {
      requestAnimationFrame(() => { visible = true; });
    }
  });

  function handleAgree() {
    if (!checked) return;
    localStorage.setItem("kyp_disclaimer_agreed", "1");
    visible = false;
    onAgree?.();
  }
</script>

{#if visible}
  <div class="disclaimer-overlay">
    <div class="disclaimer-sheet">
      <h2 class="disclaimer-title">Disclaimer</h2>

      <div class="disclaimer-body">
        <p>
          KYP uses an AI-powered research agent to analyze publicly available
          on-chain data, documentation, and community activity for each protocol.
          This is <strong>not financial advice</strong>.
        </p>
        <p>
          The Deep Research score is a <strong>relative quality signal</strong>,
          not a recommendation to buy, hold, or stake. A higher score means the
          AI found more verifiable information — it does <em>not</em> guarantee
          safety, returns, or legitimacy.
        </p>
        <p>
          DYOR (Do Your Own Research) means exactly that. KYP gives you a
          starting point. You are solely responsible for any decisions you make.
        </p>
        <p>
          Protocol data can be incomplete, outdated, or inaccurate. Smart
          contracts carry inherent risk. Never commit more than you can afford to
          lose.
        </p>
        <p class="disclaimer-highlight">
          By using KYP you acknowledge that all research output is
          AI-generated and may contain errors.
        </p>
      </div>

      <label class="agree-row">
        <input type="checkbox" bind:checked class="agree-check" />
        <span class="agree-text">I have read and agree to the above</span>
      </label>

      <button class="agree-btn" disabled={!checked} onclick={handleAgree}>
        Continue to KYP
      </button>
    </div>
  </div>
{/if}

<style>
  .disclaimer-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    backdrop-filter: blur(4px);
  }

  /* Desktop: centered card */
  .disclaimer-sheet {
    background: var(--surface);
    border-radius: 20px;
    width: 100%;
    max-width: 520px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 36px 32px 28px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
  }

  .disclaimer-title {
    font-family: var(--display);
    font-size: 26px;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 20px;
  }

  .disclaimer-body {
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--text);
    margin-bottom: 24px;
  }
  .disclaimer-body p {
    margin: 0 0 14px;
  }
  .disclaimer-body p:last-child {
    margin-bottom: 0;
  }
  .disclaimer-highlight {
    background: rgba(124, 58, 237, 0.08);
    border-radius: 10px;
    padding: 12px 16px;
    font-weight: 500;
  }
  :global(.dark) .disclaimer-highlight {
    background: rgba(124, 58, 237, 0.15);
  }

  .agree-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    cursor: pointer;
    user-select: none;
  }
  .agree-check {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    cursor: pointer;
  }
  .agree-text {
    font-size: 14px;
    color: var(--text-muted);
  }

  .agree-btn {
    display: block;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: var(--accent);
    color: #fff;
    font-family: var(--sans);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .agree-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  .agree-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Mobile: slide up from bottom */
  @media (max-width: 640px) {
    .disclaimer-overlay {
      align-items: flex-end;
      padding: 0;
    }
    .disclaimer-sheet {
      border-radius: 20px 20px 0 0;
      max-height: 90vh;
      padding: 28px 24px 24px;
      animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
</style>
