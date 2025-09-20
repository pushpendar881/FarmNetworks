<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { isAdminAuthenticated } from '$lib/stores/adminAuth.js'
  
  onMount(() => {
    const unsubscribe = isAdminAuthenticated.subscribe((authenticated) => {
      if (authenticated) {
        goto('/adminportal/test-dashboard')
      } else {
        goto('/auth/login')
      }
    })
    
    return unsubscribe
  })
</script>

<svelte:head>
  <title>Admin Portal - FarmNetworks</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Admin Portal</h1>
    <p class="text-lg text-gray-600 mb-8">Redirecting to login...</p>
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
  </div>
</div>