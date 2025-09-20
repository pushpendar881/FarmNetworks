<script>
  import { adminAuthStore } from '$lib/stores/adminAuth.js';
  import { goto } from '$app/navigation';

  let email = 'admin@example.com';
  let password = 'password123';
  let isSubmitting = false;
  let result = null;

  const handleSubmit = async () => {
    console.log('Admin test login started');
    isSubmitting = true;
    result = null;

    try {
      console.log('Calling adminAuthStore.adminSignIn with:', { email, password: '***' });
      const loginResult = await adminAuthStore.adminSignIn(email, password);
      console.log('Admin login result:', loginResult);
      result = loginResult;

      if (loginResult.success) {
        console.log('Admin login successful, redirecting...');
        goto('/adminportal/test-dashboard');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      result = { success: false, error: error.message };
    } finally {
      isSubmitting = false;
    }
  };
</script>

<svelte:head>
  <title>Test Admin Login - Admin Portal</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full bg-white p-8 rounded-lg shadow">
    <h1 class="text-2xl font-bold mb-6">Test Admin Login</h1>
    
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        class="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Signing in...' : 'Admin Sign In'}
      </button>
    </form>

    {#if result}
      <div class="mt-4 p-4 rounded-md {result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
        <h3 class="font-medium">Result:</h3>
        <pre class="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </div>
    {/if}

    <div class="mt-4">
      <a href="/auth/login" class="text-blue-600 hover:text-blue-800">← Back to normal admin login</a>
    </div>
  </div>
</div>