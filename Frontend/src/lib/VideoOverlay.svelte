<script>
  let { open = $bindable(false), videoId = "" } = $props();

  function close() {
    open = false;
  }

  function handleKeydown(e) {
    if (e.key === "Escape") close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="overlay" role="presentation">
    <div class="video-wrap" role="presentation">
      <div class="video-container">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/{videoId}?autoplay=1&cc_load_policy=1&color=white&controls=0&fs=0&loop=1&playlist={videoId}&playsinline=1"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          title="How it works"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; pointer-events: none;"
        ></iframe>
      </div>
    </div>
  </div>
  <button class="close-btn" onclick={close} aria-label="Close video">
    <span class="material-symbols-outlined">close</span>
  </button>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: #fff;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.dark) .overlay {
    background: #000;
  }
  .close-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 16px;
    border-radius: 100%;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover {
    background: rgba(0, 0, 0, 0.75);
  }
  .close-btn .material-symbols-outlined {
    font-size: 36px;
  }
  .video-wrap {
    width: 100vw;
    height: 100vh;
    padding: 0;
  }
  .video-container {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
