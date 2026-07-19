<script>
  import { tickWorker } from "./api.js";
  import { getWallet } from "./wallet.svelte.js";

  const HEARTBEAT_MS = 30 * 1000;
  let wallet = getWallet();
  let timer = null;

  function start() {
    stop();
    tick();
    timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        tick();
      }
    }, HEARTBEAT_MS);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  async function tick() {
    if (!wallet.authenticated) return;
    try {
      await tickWorker();
    } catch {
      // silent — heartbeat failures are non-critical
    }
  }

  $effect(() => {
    if (wallet.authenticated) {
      start();
    } else {
      stop();
    }
    return () => stop();
  });
</script>
