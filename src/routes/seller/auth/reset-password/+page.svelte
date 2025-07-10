<script>
    import { supabase } from '$lib/supabase.js';
    import { addToast } from '$lib/stores/toast.js';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
  
    let password = '';
    let confirmPassword = '';
    let isSubmitting = false;
    let isSuccess = false;
  
    // Check if user has a valid session for password reset
    onMount(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        addToast('Invalid or expired reset link. Please request a new password reset.', 'error');
        goto('/seller/auth/forgot-password');
        return;
      }
      
      // Check if this is a recovery session (password reset)
      // If user has a regular session but didn't come from password reset, redirect to dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const fromCallback = urlParams.get('from') === 'callback';
      
      if (!fromCallback && data.session) {
        // This might be a regular authenticated user trying to access reset page
        addToast('You are already logged in', 'info');
        goto('/seller/auth/dashboard');
      }
    });
  
    async function handleReset(e) {
      e.preventDefault();
      
      if (password !== confirmPassword) {
        addToast('Passwords do not match', 'error');
        return;
      }
      
      if (password.length < 6) {
        addToast('Password must be at least 6 characters long', 'error');
        return;
      }
      
      isSubmitting = true;
      
      try {
        const { error } = await supabase.auth.updateUser({ password });
        
        if (error) {
          addToast(error.message || 'Failed to update password', 'error');
        } else {
          isSuccess = true;
          addToast('Password updated successfully! Please log in.', 'success');
          
          // Sign out the user so they need to log in with new password
          await supabase.auth.signOut();
          
          // Redirect to login page
          setTimeout(() => goto('/seller/auth/login'), 2000);
        }
      } catch (error) {
        console.error('Password reset error:', error);
        addToast('An unexpected error occurred', 'error');
      } finally {
        isSubmitting = false;
      }
    }
  </script>
  
  <svelte:head>
    <title>Set New Password - Farm Networks</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
          <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set New Password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>
  
      {#if isSuccess}
        <div class="rounded-md bg-green-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">
                Password Updated Successfully!
              </h3>
              <div class="mt-2 text-sm text-green-700">
                <p>Your password has been updated. Redirecting to login...</p>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <form class="mt-8 space-y-6" on:submit|preventDefault={handleReset}>
          <div class="space-y-4">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  bind:value={password}
                  required
                  minlength="6"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Enter new password"
                />
              </div>
            </div>
  
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div class="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  bind:value={confirmPassword}
                  required
                  minlength="6"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>
  
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isSubmitting}
                <LoadingSpinner size="small" />
                Updating Password...
              {:else}
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg class="h-5 w-5 text-green-500 group-hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </span>
                Update Password
              {/if}
            </button>
          </div>
        </form>
      {/if}
  
      <div class="text-center">
        <p class="text-sm text-gray-600">
          Remember your password?
          <a href="/seller/auth/login" class="font-medium text-green-600 hover:text-green-500">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  </div>