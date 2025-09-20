<script>
  import { onMount } from 'svelte';
  import { supabase, PUBLIC_SUPABASE_URL } from '$lib/supabase.js';
  import { browser } from '$app/environment';

  let debugInfo = {
    browser: false,
    supabaseUrl: '',
    supabaseClient: null,
    connectionTest: null,
    envVars: {}
  };

  onMount(async () => {
    debugInfo.browser = browser;
    debugInfo.supabaseUrl = PUBLIC_SUPABASE_URL;
    debugInfo.supabaseClient = !!supabase;
    
    // Test environment variables
    debugInfo.envVars = {
      PUBLIC_SUPABASE_URL: PUBLIC_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 'Not found'
    };

    // Test Supabase connection
    if (supabase) {
      try {
        console.log('Testing Admin Supabase connection...');
        const { data, error } = await supabase.auth.getSession();
        debugInfo.connectionTest = {
          success: !error,
          error: error?.message || null,
          hasSession: !!data?.session
        };
        console.log('Admin Supabase connection test result:', debugInfo.connectionTest);
      } catch (err) {
        debugInfo.connectionTest = {
          success: false,
          error: err.message,
          hasSession: false
        };
        console.error('Admin Supabase connection test failed:', err);
      }
    } else {
      debugInfo.connectionTest = {
        success: false,
        error: 'Supabase client is null',
        hasSession: false
      };
    }

    // Force reactivity
    debugInfo = { ...debugInfo };
  });
</script>

<svelte:head>
  <title>Supabase Debug - Admin Portal</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Admin Supabase Debug Information</h1>
    
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Environment Check</h2>
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="font-medium">Browser Environment:</span>
          <span class="{debugInfo.browser ? 'text-green-600' : 'text-red-600'}">
            {debugInfo.browser ? 'Yes' : 'No'}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="font-medium">Supabase URL:</span>
          <span class="text-sm text-gray-600 break-all">{debugInfo.supabaseUrl || 'Not loaded'}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-medium">Supabase Client:</span>
          <span class="{debugInfo.supabaseClient ? 'text-green-600' : 'text-red-600'}">
            {debugInfo.supabaseClient ? 'Initialized' : 'Not initialized'}
          </span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Connection Test</h2>
      {#if debugInfo.connectionTest}
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="font-medium">Connection Status:</span>
            <span class="{debugInfo.connectionTest.success ? 'text-green-600' : 'text-red-600'}">
              {debugInfo.connectionTest.success ? 'Success' : 'Failed'}
            </span>
          </div>
          {#if debugInfo.connectionTest.error}
            <div class="flex justify-between">
              <span class="font-medium">Error:</span>
              <span class="text-red-600 text-sm">{debugInfo.connectionTest.error}</span>
            </div>
          {/if}
          <div class="flex justify-between">
            <span class="font-medium">Has Session:</span>
            <span class="{debugInfo.connectionTest.hasSession ? 'text-green-600' : 'text-gray-600'}">
              {debugInfo.connectionTest.hasSession ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      {:else}
        <p class="text-gray-600">Testing connection...</p>
      {/if}
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Raw Debug Data</h2>
      <pre class="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Navigation</h2>
      <div class="space-y-2">
        <a href="/test-login" class="block text-blue-600 hover:text-blue-800">→ Test Admin Login</a>
        <a href="/auth/login" class="block text-blue-600 hover:text-blue-800">→ Normal Admin Login</a>
        <a href="/" class="block text-blue-600 hover:text-blue-800">→ Home</a>
      </div>
    </div>
  </div>
</div>