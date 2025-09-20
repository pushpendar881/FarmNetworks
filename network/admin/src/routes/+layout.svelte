<script>
  import { onMount } from 'svelte';
  import { adminAuthStore } from '$lib/stores/adminAuth.js';
  import '../app.css';
  import Toast from '$lib/components/Toast.svelte';

  onMount(async () => {
    // Initialize admin auth
  });
</script>

<slot />
<Toast />