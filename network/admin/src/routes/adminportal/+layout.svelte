<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { adminAuthStore, adminUser, adminLoading, isAdminAuthenticated } from '$lib/stores/adminAuth.js';
  import Sidebar from '$lib/components/admin/sidebar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let initialized = false;

  onMount(async () => {
    // Admin auth is already initialized by parent layout
    initialized = true;
  });

  // Redirect if not authenticated
  $: if (initialized && !$adminLoading && !$isAdminAuthenticated) {
    goto('/admin/auth/login');
  }
</script>

{#if $adminLoading || !initialized}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <LoadingSpinner />
      <p class="mt-4 text-gray-600">Loading admin panel...</p>
    </div>
  </div>
{:else if $isAdminAuthenticated}
  <div class="admin-layout">
    <Sidebar />
    <main class="main-content">
      <slot />
    </main>
  </div>
{:else}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <p class="text-gray-600">Redirecting to login...</p>
    </div>
  </div>
{/if}

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: #f7fafc;
  }

  .main-content {
    flex: 1;
    margin-left: 280px;
    padding: 2rem;
    background: #f7fafc;
    min-height: 100vh;
  }

  @media (max-width: 768px) {
    .main-content {
      margin-left: 0;
      padding: 1rem;
    }
  }
</style> 