<script>
  import { supabase } from '$lib/supabase.js';
  import { addToast } from '$lib/stores/toast.js';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let email = '';
  let isSubmitting = false;
  let emailSent = false;

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your email address', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    isSubmitting = true;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/seller/auth/callback?type=recovery`
      });
      if (error) {
        addToast(error.message || 'Failed to send reset email', 'error');
      } else {
        emailSent = true;
        addToast('Reset email sent! Check your inbox.', 'success');
      }
    } catch (error) {
      addToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      isSubmitting = false;
    }
  };

  const resendEmail = () => {
    emailSent = false;
    handleForgotPassword(new Event('submit'));
  };
</script>

<svelte:head>
  <title>Forgot Password - Farm Networks</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div>
      <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
        <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Forgot Your Password?
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Enter your email address and we'll send you a link to reset your password
      </p>
    </div>
    {#if emailSent}
      <div class="rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              Email Sent Successfully!
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>We've sent a password reset link to <strong>{email}</strong></p>
              <p class="mt-1">Check your inbox and click the link to reset your password.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="text-center space-y-4">
        <p class="text-sm text-gray-600">
          Didn't receive the email?
        </p>
        <button
          on:click={resendEmail}
          disabled={isSubmitting}
          class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {#if isSubmitting}
            <LoadingSpinner size="small" />
            Sending...
          {:else}
            Resend Email
          {/if}
        </button>
      </div>
    {:else}
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleForgotPassword}>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <div class="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              bind:value={email}
              required
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="Enter your email address"
            />
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
              Sending Reset Email...
            {:else}
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-green-500 group-hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              Send Reset Email
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
