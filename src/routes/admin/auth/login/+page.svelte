<script>
  import { authStore, loading } from '$lib/stores/auth.js';
  import { addToast } from '$lib/stores/toast.js';
  import { goto } from '$app/navigation';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let formData = {
    email: '',
    password: ''
  };

  let rememberMe = false;
  let isSubmitting = false;
  let errors = {};
  let errorMessage = '';
  let showPassword = false;

  const navigateBack = () => {
    goto('/');
  };

  const togglePasswordVisibility = () => {
    showPassword = !showPassword;
  };

  const clearError = () => {
    errorMessage = '';
  };

  const validateForm = () => {
    errors = {};
    let isValid = true;

    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    errorMessage = '';
    if (!validateForm()) {
      errorMessage = Object.values(errors).filter(Boolean).join(', ');
      if (!errorMessage) {
        addToast('Please fix the errors in the form', 'error');
      }
      return;
    }

    isSubmitting = true;

    try {
      const result = await authStore.signIn(formData.email, formData.password);

      if (result.success) {
        // Check if user is admin
        if (result.role === 'admin') {
          addToast('Welcome back, Admin!', 'success');
          
          // Store remember me preference in localStorage
          if (rememberMe) {
            localStorage.setItem('adminRememberMe', 'true');
          } else {
            localStorage.removeItem('adminRememberMe');
          }
          
          goto('/admin/dashboard');
        } else {
          errorMessage = 'Access denied. Admin privileges required.';
           await authStore.signOut();
        }
      } else {
        // Handle specific error cases
        if (result.code === 'INVALID_CREDENTIALS') {
          errorMessage = 'Invalid email or password.';
        } else if (result.code === 'EMAIL_NOT_CONFIRMED') {
          errorMessage = 'Please confirm your email before logging in.';
          goto('/admin/auth/confirm-email');
        } else {
          errorMessage = result.error || 'Login failed';
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      isSubmitting = false;
    }
  };

  // Check for remember me on component mount
  $: {
    if (typeof window !== 'undefined' && localStorage.getItem('adminRememberMe') === 'true') {
      rememberMe = true;
    }
  }
</script>

<svelte:head>
  <title>Admin Login - Farm Networks</title>
  <meta name="description" content="Secure admin login portal for Farm Networks management system" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
  <div class="w-full max-w-md">
    <!-- Back Button -->
    <button 
      on:click={navigateBack}
      class="mb-8 flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
      disabled={$loading}
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <a href ="/">Back to Portal Selection</a>
    </button>

    <!-- Login Card -->
    <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <!-- Header -->
      <div class="text-center py-8 px-6">
        <!-- Admin Icon -->
        <div class="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
        <p class="text-gray-600 text-sm">Sign in to your admin account</p>
      </div>

      <!-- Form -->
      <div class="px-6 pb-8">
        {#if errorMessage}
          <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-red-800 text-sm font-medium">Authentication Error</p>
                <p class="text-red-700 text-sm mt-1">{errorMessage}</p>
              </div>
              <button on:click={clearError} class="text-red-500 hover:text-red-700 ml-2" aria-label="Clear error">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              bind:value={formData.email}
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 {errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
              required
              disabled={$loading || isSubmitting}
              autocomplete="username"
            />
            {#if errors.email}
              <p class="mt-2 text-sm text-red-600">{errors.email}</p>
            {/if}
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                bind:value={formData.password}
                class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 {errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
                required
                disabled={$loading || isSubmitting}
                autocomplete={rememberMe ? 'current-password' : 'off'}
              />
              <button
                type="button"
                on:click={togglePasswordVisibility}
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={$loading || isSubmitting}
                tabindex="-1"
              >
                {#if showPassword}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                {:else}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                {/if}
              </button>
            </div>
            {#if errors.password}
              <p class="mt-2 text-sm text-red-600">{errors.password}</p>
            {/if}
          </div>

          <!-- Remember Me and Forgot Password -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                bind:checked={rememberMe}
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={$loading || isSubmitting}
              />
              <label for="rememberMe" class="ml-2 text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <!-- <a href="/admin/auth/forgot-password" class="text-sm text-blue-600 hover:text-blue-700 transition-colors">
              Forgot your password?
            </a> -->
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={isSubmitting || $loading || !formData.email || !formData.password}
            class="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {#if isSubmitting || $loading}
              <div class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </div>
            {:else}
              Sign in
            {/if}
          </button>

          <!-- Footer Text -->
          <div class="text-center pt-4">
            <!-- <p class="text-xs text-gray-500">
              Don't have an account? <a href="/admin/auth/register" class="text-blue-600 hover:text-blue-700 transition-colors">Sign up here</a>
            </p> -->
          </div>
        </form>
      </div>
    </div>

    <!-- Security Notice -->
    <div class="mt-6 text-center">
      <p class="text-xs text-gray-500">
        Secure admin access only. Unauthorized access prohibited.
      </p>
      <p class="text-xs text-gray-500 mt-1">
        Need help? <a href="mailto:support@farmnetworks.com" class="text-blue-600 hover:text-blue-700 transition-colors">Contact support</a>
      </p>
    </div>
  </div>
</div>

<style>
  /* Additional animations and styling */
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Focus styles for better accessibility */
  input:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  button:focus {
    outline: none;
  }
</style>