<script>
  import { onMount } from 'svelte';
  import { initializeAdminAuth } from '$lib/stores/adminAuth.js';

  onMount(async () => {
    // Initialize admin auth only for admin routes
    await initializeAdminAuth();
  });
</script>

<slot />