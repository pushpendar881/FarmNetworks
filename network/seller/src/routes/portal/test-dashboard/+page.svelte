<script>
  import { user } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';

  let currentUser = null;

  onMount(() => {
    const unsubscribe = user.subscribe(value => {
      currentUser = value;
    });

    return unsubscribe;
  });
</script>

<svelte:head>
  <title>Test Dashboard - Seller Portal</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Test Dashboard</h1>
    
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Login Success!</h2>
      <p class="text-green-600 mb-4">You have successfully logged in to the seller portal.</p>
      
      {#if currentUser}
        <div class="bg-gray-50 p-4 rounded-md">
          <h3 class="font-medium text-gray-900 mb-2">User Information:</h3>
          <pre class="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(currentUser, null, 2)}</pre>
        </div>
      {:else}
        <p class="text-gray-600">Loading user information...</p>
      {/if}
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Navigation</h2>
      <div class="space-y-2">
        <a href="/portal/dashboard" class="block text-blue-600 hover:text-blue-800">→ Full Dashboard</a>
        <a href="/auth/login" class="block text-blue-600 hover:text-blue-800">→ Back to Login</a>
        <a href="/test-login" class="block text-blue-600 hover:text-blue-800">→ Test Login Page</a>
      </div>
    </div>
  </div>
</div>