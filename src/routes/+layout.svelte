<script>
  import { onMount } from 'svelte';
  import { initializeAuth } from '$lib/stores/auth.js';
  import { initializeAdminAuth } from '$lib/stores/adminAuth.js';
  import '../app.css';

  onMount(async () => {
    // Initialize both auth systems
    await Promise.all([
      initializeAuth(),
      initializeAdminAuth()
    ]);
  });
</script>

<slot />