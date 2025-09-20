<script>
  import { onMount } from 'svelte';
  import { authStore, user } from '$lib/stores/auth.js';
  import '../app.css';
  import { supabase } from '$lib/supabase.js';
  import Toast from '$lib/components/Toast.svelte';

  onMount(async () => {
    if (typeof window !== 'undefined') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        user.set(session.user);
      }
    }
  });
</script>

<slot />
<Toast />