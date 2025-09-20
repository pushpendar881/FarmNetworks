<script>
  import { onMount } from 'svelte';
  import { initializeAuth } from '$lib/stores/auth.js';
  // Remove initializeAdminAuth from global initialization
  import '../app.css';

  onMount(async () => {
    // Only initialize the main auth system globally
    // Admin auth will be initialized only in admin routes
    await initializeAuth();
  });
</script>

<slot />