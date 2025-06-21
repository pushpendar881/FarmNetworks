<script>
  import { authStore, loading } from '$lib/stores/auth.js';
  import { addToast } from '$lib/stores/toast.js';
  import { goto } from '$app/navigation';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let email = '';
  let password = '';
  let rememberMe = false;
  let isSubmitting = false;
  let showResendButton = false;
  let resendMessage = '';

  const handleSubmit = async () => {
      if (!email || !password) {
          addToast('Please fill in all fields', 'error');
          return;
      }

      isSubmitting = true;
      showResendButton = false;
      resendMessage = '';

      try {
          const result = await authStore.signIn(email, password);

          if (result.success) {
              addToast('Welcome back!', 'success');
              
              // Redirect based on role
              if (result.role === 'admin') {
                  goto('/admin/dashboard');
              } else if (result.role === 'seller') {
                  goto('/seller/protected/dashboard');
              } else {
                  goto('/dashboard'); // fallback
              }
          } else {
              // Handle specific error cases
              if (result.code === 'EMAIL_NOT_CONFIRMED') {
                  addToast('Please confirm your email address before signing in', 'error');
                  showResendButton = true;
              } else if (result.code === 'INVALID_CREDENTIALS') {
                  addToast('Invalid email or password. Please check your credentials.', 'error');
              } else if (result.code === 'RATE_LIMITED') {
                  addToast('Too many login attempts. Please wait a moment and try again.', 'error');
              } else {
                  addToast(result.error || 'Login failed', 'error');
              }
          }
      } catch (error) {
          console.error('Login error:', error);
          addToast('An unexpected error occurred', 'error');
      } finally {
          isSubmitting = false;
      }
  };

  const resendConfirmation = async () => {
      if (!email) {
          addToast('Please enter your email address first', 'error');
          return;
      }

      try {
          const result = await authStore.resendConfirmation(email);
          
          if (result.success) {
              resendMessage = 'Confirmation email sent! Please check your inbox and spam folder.';
              addToast('Confirmation email sent!', 'success');
              showResendButton = false;
          } else {
              addToast(result.error || 'Failed to resend confirmation email', 'error');
          }
      } catch (error) {
          addToast('Failed to resend confirmation email', 'error');
      }
  };
</script>

<svelte:head>
  <title>Seller Login - Farm Networks</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
      <div>
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Seller Login
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
              Sign in to your seller account
          </p>
      </div>

      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
          <div class="space-y-4">
              <div>
                  <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                      id="email"
                      name="email"
                      type="email"
                      bind:value={email}
                      required
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter your email"
                  />
              </div>

              <div>
                  <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                  <input
                      id="password"
                      name="password"
                      type="password"
                      bind:value={password}
                      required
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter your password"
                  />
              </div>

              <div class="flex items-center justify-between">
                  <div class="flex items-center">
                      <input
                          id="rememberMe"
                          name="rememberMe"
                          type="checkbox"
                          bind:checked={rememberMe}
                          class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label for="rememberMe" class="ml-2 block text-sm text-gray-900">
                          Remember me
                      </label>
                  </div>

                  <div class="text-sm">
                      <a href="/seller/auth/forgot-password" class="font-medium text-green-600 hover:text-green-500">
                          Forgot your password?
                      </a>
                  </div>
              </div>
          </div>

        
          {#if resendMessage}
              <div class="rounded-md bg-green-50 p-4">
                  <div class="flex">
                      <div class="flex-shrink-0">
                          <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                      </div>
                      <div class="ml-3">
                          <p class="text-sm font-medium text-green-800">
                              {resendMessage}
                          </p>
                          <p class="text-xs text-green-600 mt-1">
                              Check your spam folder if you don't see the email.
                          </p>
                      </div>
                  </div>
              </div>
          {/if}

          <div>
              <button
                  type="submit"
                  disabled={isSubmitting || $loading}
                  class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {#if isSubmitting || $loading}
                      <LoadingSpinner size="small" />
                      Signing in...
                  {:else}
                      Sign in
                  {/if}
              </button>
          </div>

          
          {#if showResendButton}
              <div class="text-center">
                  <button
                      type="button"
                      on:click={resendConfirmation}
                      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Resend Confirmation Email
                  </button>
              </div>
          {/if}

          <div class="text-center">
              <p class="text-sm text-gray-600">
                  Don't have an account?
                  <a href="/seller/auth/signup" class="font-medium text-green-600 hover:text-green-500">
                      Sign up here
                  </a>
              </p>
          </div>
      </form>
  </div>
</div>

