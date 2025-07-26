<script>
  import '../app.css'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { initializeAuth } from '$lib/stores/auth.js'
  import Toast from '$lib/components/Toast.svelte'
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte'
  
  // Initialize authentication on app start
  onMount(() => {
    initializeAuth()
  })
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="FarmNetworks - Dual Portal Web Application" />
</svelte:head>

<main class="min-h-screen">
  <slot />
</main>

<!-- Global Toast Notifications -->
<Toast />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>