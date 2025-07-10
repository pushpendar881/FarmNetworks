<script>
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';
  import { onMount } from 'svelte';
  import { addToast } from '$lib/stores/toast.js';

  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type');
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      
      // Handle password recovery flow
      if (type === 'recovery' || (accessToken && refreshToken)) {
        // Set the session from the URL parameters for password reset
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            addToast('Invalid or expired reset link. Please request a new password reset.', 'error');
            goto('/seller/auth/forgot-password');
            return;
          }
        }
        
        // Redirect to password reset page with callback indicator
        addToast('Please set your new password', 'info');
        goto('/seller/auth/reset-password?from=callback');
      } else {
        // Handle regular authentication flow
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          addToast('Authentication error', 'error');
          goto('/seller/auth/login');
        } else if (data.session) {
          addToast('Successfully authenticated!', 'success');
          goto('/seller/auth/dashboard');
        } else {
          addToast('Authentication failed', 'error');
          goto('/seller/auth/login');
        }
      }
    } catch (error) {
      console.error('Callback error:', error);
      addToast('An unexpected error occurred', 'error');
      goto('/seller/auth/login');
    }
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
    <h2 class="mt-4 text-xl font-semibold text-gray-900">Processing Authentication...</h2>
    <p class="mt-2 text-gray-600">Please wait while we authenticate your request.</p>
  </div>
</div>