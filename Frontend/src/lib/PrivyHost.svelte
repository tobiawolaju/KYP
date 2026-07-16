<script>
  import { onMount } from "svelte";
  import React from "react";

  let el;

  onMount(async () => {
    const { createRoot } = await import("react-dom/client");
    const { default: PrivyApp } = await import("./privy.js");
    const root = createRoot(el);
    root.render(React.createElement(PrivyApp));
    return () => root.unmount();
  });
</script>

<div bind:this={el} hidden></div>
