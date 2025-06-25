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
<!-- 
<svelte:head>
  <title>Admin Login - Farm Networks</title>
  <meta name="description" content="Secure admin login portal for Farm Networks management system" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
        <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Admin Login
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Sign in to your admin account
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
            bind:value={formData.email}
            required
            class="mt-1 block w-full px-3 py-2 border {errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your admin email"
            autocomplete="username"
          />
          {#if errors.email}
            <p class="mt-1 text-sm text-red-600">{errors.email}</p>
          {/if}
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            bind:value={formData.password}
            required
            class="mt-1 block w-full px-3 py-2 border {errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            autocomplete={rememberMe ? 'current-password' : 'off'}
          />
          {#if errors.password}
            <p class="mt-1 text-sm text-red-600">{errors.password}</p>
          {/if}
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              bind:checked={rememberMe}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="rememberMe" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <a href="/admin/auth/forgot-password" class="font-medium text-blue-600 hover:text-blue-500">
              Forgot your password?
            </a>
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting || $loading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isSubmitting || $loading}
            <LoadingSpinner size="small" />
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>
      </div>

      <div class="text-center">
        <p class="text-sm text-gray-600">
          Secure admin access only. Unauthorized access prohibited.
        </p>
        {#if !isSubmitting}
          <p class="mt-2 text-sm text-gray-500">
            Need help? <a href="mailto:support@farmnetworks.com" class="text-blue-600 hover:text-blue-500">Contact support</a>
          </p>
        {/if}
      </div>
    </form>
  </div>
</div> -->
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600">
  <div class="container mx-auto px-6">
    <button 
      on:click={navigateBack}
      class="mb-8 bg-white/20 text-white border-0 hover:bg-white/30 px-4 py-2 rounded-md flex items-center transition-all duration-300 hover:scale-105"
      disabled={$loading}
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Portal Selection
    </button>

    <div class="max-w-md mx-auto glass-card bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 animate-fade-in">
      <div class="text-center p-6 pb-0">
        <div class="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Admin Portal Access</h2>
        <p class="text-white/80">High Security Level Required</p>
      </div>
      
      <div class="p-6">
        {#if errorMessage}
          <div class="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-100 flex items-start">
            <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-medium">Login Error</p>
              <p class="text-sm">{errorMessage}</p>
            </div>
            <button on:click={clearError} class="ml-auto text-red-200 hover:text-white" aria-label="Clear error">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          <!-- Email Input -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-white/90">
              Administrator Email
            </label>
            <input
              id="email"
              placeholder="admin@devicenet.com"
              type="email"
              bind:value={formData.email}
              class="w-full px-4 py-3 bg-white/90 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
              required
              disabled={$loading}
            />
          </div>

          <!-- Password Input -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-medium text-white/90">
              Secure Password
            </label>
            <div class="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                bind:value={formData.password}
                class="w-full px-4 py-3 pr-12 bg-white/90 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                placeholder="Enter admin password"
                required
                disabled={$loading}
              />
              <button
                type="button"
                on:click={togglePasswordVisibility}
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={$loading}
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
          </div>

          <button 
            type="submit" 
            class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 py-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg"
            disabled={$loading || !formData.email || !formData.password}
          >
            {#if $loading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Authenticating...
            {:else}
              🔐 SECURE LOGIN
            {/if}
          </button>

          <div class="text-center space-y-2 text-sm text-white/70">
            <p>-----FarmNetwork-----</p>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Demo credentials hint -->
   
  </div>
</div>

<style>
  .glass-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.6s ease-out;
  }
</style>