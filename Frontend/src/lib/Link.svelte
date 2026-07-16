<script>
  import { navigate, useLocation } from './router.svelte.js';
  let { to, children, class: className = '', onclick, ...rest } = $props();
  let location = useLocation();
  let active = $derived(location.pathname === to);
  let classes = $derived(active ? `${className} active` : className);
</script>

<a href={to} onclick={(e) => { e.preventDefault(); onclick?.(e); navigate(to); }} class={classes} {...rest}>
  {#if children}
    {@render children()}
  {/if}
</a>
