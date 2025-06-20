<script>
  import { authStore, user } from '$lib/stores/auth.js';
  import { addToast } from '$lib/stores/toast.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    
  let email = '';
  let password = '';
  let loading = false;
  let showPassword = false;
  let errorMessage = '';

  // onMount(() => {
  //   if ($user) {
  //     goto('/seller/dashboard');
  //   }
  // });

  function navigateBack() {
    goto('/', {replaceState: true});
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function clearError() {
    errorMessage = '';
  }

  async function handleLogin(e) {
    e.preventDefault();
    loading = true;
    clearError();

    // Basic validation
    if (!email.trim() || !password.trim()) {
      errorMessage = "Please fill in all required fields";
      loading = false;
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessage = "Please enter a valid email address";
      loading = false;
      return;
    }

    // Password length validation - FIXED
    if (password.length < 6) {
      errorMessage = "Password must be at least 6 characters long";
      loading = false;
      return;
    }

    try {
      const { data, error } = await authStore.signIn(email, password);
      
      if (error) {
        addToast({
          type: 'error',
          title: 'Login Failed',
          message: error.message
        });
      } else {
        addToast({
          type: 'success',
          title: 'Login Successful',
          message: 'Welcome to Admin Portal!'
        });
        goto('/seller/portal/dashboard');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Login Error',
        message: 'An unexpected error occurred'
      });
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600">
  <div class="container mx-auto px-6">
    <button 
      on:click={navigateBack}
      class="mb-8 bg-white/20 text-white border-0 hover:bg-white/30 px-4 py-2 rounded-md flex items-center transition-all duration-300 hover:scale-105"
      disabled={loading}
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
        <h2 class="text-2xl font-bold text-white mb-2">Seller Portal Access</h2>

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

        <form on:submit={handleLogin} class="space-y-6">
          <!-- Email Input -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-white/90">
              Administrator Email
            </label>
            <input
              id="email"
              placeholder="admin@devicenet.com"
              type="email"
              bind:value={email}
              class="w-full px-4 py-3 bg-white/90 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
              required
              disabled={loading}
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
                bind:value={password}
                class="w-full px-4 py-3 pr-12 bg-white/90 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                placeholder="Enter admin password"
                required
                disabled={loading}
              />
              <button
                type="button"
                on:click={togglePasswordVisibility}
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
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
            disabled={loading}
          >
            {#if loading}
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
            <p>Create your FarmNetwork Sellers <a href="/seller/auth/singup" class="text-lg underline">Account</a></p>
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