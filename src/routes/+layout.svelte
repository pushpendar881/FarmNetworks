<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.js';
  import { browser } from '$app/environment';

  let loading = true;

  onMount(async () => {
    if (browser) {
      // Initialize auth on client side
      await authStore.initializeAuth();
      
      // Check authentication and redirect if needed
      const { pathname } = $page.url;
      
      // Define route patterns
      const adminProtectedRoutes = ['/admin/dashboard'];
      const sellerProtectedRoutes = ['/seller/portal'];
      const adminAuthRoutes = ['/admin/auth/login', '/admin/auth/signup'];
      const sellerAuthRoutes = ['/seller/auth/login', '/seller/auth/signup'];
      
      // Check route types
      const isAdminProtected = adminProtectedRoutes.some(route => pathname.startsWith(route));
      const isSellerProtected = sellerProtectedRoutes.some(route => pathname.startsWith(route));
      const isAdminAuth = adminAuthRoutes.some(route => pathname.startsWith(route));
      const isSellerAuth = sellerAuthRoutes.some(route => pathname.startsWith(route));
      
      // Get current user
      const currentUser = await authStore.getCurrentUser();
      
      if (currentUser) {
        const userType = currentUser.user_metadata?.user_type || 'seller';
        
        // Redirect authenticated users away from auth pages
        if (isAdminAuth || isSellerAuth) {
          if (userType === 'admin') {
            goto('/admin/dashboard');
          } else {
            goto('/seller/portal/dashboard');
          }
        }
        
        // Check if user is accessing correct portal
        if (isAdminProtected && userType !== 'admin') {
          goto('/seller/portal/dashboard');
        }
        
        if (isSellerProtected && userType === 'admin') {
          goto('/admin/dashboard');
        }
      } else {
        // No session - redirect to appropriate login
        if (isAdminProtected) {
          goto('/admin/auth/login');
        }
        
        if (isSellerProtected) {
          goto('/seller/auth/login');
        }
      }
      
      loading = false;
    }
  });
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="FarmNetworks - Dual Portal Web Application" />
</svelte:head>

{#if loading && browser}
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
    <div>Loading...</div>
  </div>
{:else}
  <slot />
{/if}

<!-- Global Toast Notifications -->
<Toast />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>