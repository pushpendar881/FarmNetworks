<script>
    import { authStore, loading } from '$lib/stores/auth.js';
    import { addToast } from '$lib/stores/toast.js';
    import { goto } from '$app/navigation';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  
    let formData = {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      adminKey: '' // Optional security measure for admin registration
    };
  
    let errors = {};
    let isSubmitting = false;
  
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
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
        isValid = false;
      }
  
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
  
      if (!formData.fullName) {
        errors.fullName = 'Full name is required';
        isValid = false;
      }
  
      // Optional admin key validation
      if (!formData.adminKey) {
        errors.adminKey = 'Admin registration key is required';
        isValid = false;
      } else if (formData.adminKey !== 'YOUR_SECURE_ADMIN_KEY') { // Replace with your actual key
        errors.adminKey = 'Invalid admin registration key';
        isValid = false;
      }
  
      return isValid;
    };
  
    const handleSubmit = async () => {
      if (!validateForm()) return;
  
      isSubmitting = true;
  
      try {
        const result = await authStore.signupAdmin(formData);
  
        if (result.success) {
          addToast('Admin account created successfully!', 'success');
          
          if (result.data.session) {
            // If email confirmation is not required
            goto('/admin/dashboard');
          } else {
            // If email confirmation is required
            addToast('Please check your email to confirm your account', 'info');
            goto('/admin/auth/confirm-email');
          }
        } else {
          addToast(result.error || 'Failed to create admin account', 'error');
        }
      } catch (error) {
        addToast('An unexpected error occurred', 'error');
        console.error('Signup error:', error);
      } finally {
        isSubmitting = false;
      }
    };
  </script>
  
  <svelte:head>
    <title>Admin Registration - Farm Networks</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
          <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Registration
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Create a new admin account
        </p>
      </div>
  
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
        <div class="space-y-4">
          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              bind:value={formData.fullName}
              required
              class="mt-1 block w-full px-3 py-2 border {errors.fullName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
            {#if errors.fullName}
              <p class="mt-1 text-sm text-red-600">{errors.fullName}</p>
            {/if}
          </div>
  
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              bind:value={formData.email}
              required
              class="mt-1 block w-full px-3 py-2 border {errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
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
              placeholder="Create a password (min 8 characters)"
            />
            {#if errors.password}
              <p class="mt-1 text-sm text-red-600">{errors.password}</p>
            {/if}
          </div>
  
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              bind:value={formData.confirmPassword}
              required
              class="mt-1 block w-full px-3 py-2 border {errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your password"
            />
            {#if errors.confirmPassword}
              <p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            {/if}
          </div>
  
          <div>
            <label for="adminKey" class="block text-sm font-medium text-gray-700">Admin Registration Key</label>
            <input
              id="adminKey"
              name="adminKey"
              type="password"
              bind:value={formData.adminKey}
              required
              class="mt-1 block w-full px-3 py-2 border {errors.adminKey ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin registration key"
            />
            {#if errors.adminKey}
              <p class="mt-1 text-sm text-red-600">{errors.adminKey}</p>
            {/if}
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
              Creating account...
            {:else}
              Create Admin Account
            {/if}
          </button>
        </div>
  
        <!-- <div class="text-center">
          <p class="text-sm text-gray-600">
            Already have an account? 
            <a href="/admin/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </a>
          </p>
        </div> -->
      </form>
    </div>
  </div>