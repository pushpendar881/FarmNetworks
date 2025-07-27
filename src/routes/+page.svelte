<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { user, isAuthenticated, userType } from '$lib/stores/auth.js'
  
  // Redirect authenticated users to their dashboard
  onMount(() => {
    const unsubscribe = isAuthenticated.subscribe(async (authenticated) => {
      if (authenticated) {
        const currentUserType = await new Promise(resolve => {
          userType.subscribe(type => resolve(type))()
        })
        
        if (currentUserType === 'admin') {
          goto('/admin/dashboard')
        } else {
          goto('/seller/portal/dashboard')
        }
      }
    })
    
    return unsubscribe
  })
</script>

<svelte:head>
  <title>FarmNetworks - Connect Your Farm to the Future</title>
  <meta name="description" content="Join the agricultural revolution with FarmNetworks. Connect sellers and manage farm operations efficiently." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
  <!-- Header -->
  <header class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center space-x-2">
          <!-- <div class="w-8 h-8  rounded-lg flex items-center justify-center"> -->
            <!-- <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
            </svg> -->
            <img src="/images/logo.png" alt="FarmNetworks" class="w-8 h-8">
          <!-- </div> -->
          
          <h1 class="text-2xl font-bold text-gray-900">FarmNetworks</h1>
        </div>
        
        <nav class="hidden md:flex space-x-8">
          <a href="#features" class="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
        </nav>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-16">
      <h2 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
        Connect Your Farm to the 
        <span class="text-green-600">Future</span>
      </h2>
      <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
        Join thousands of farmers and agricultural businesses using FarmNetworks to streamline operations, 
        track earnings, and connect with the agricultural community.
      </p>
    </div>

    <!-- Portal Selection Cards -->
    <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
      <!-- Seller Portal Card -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-8 border border-gray-100">
        <div class="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Seller Portal</h3>
        <p class="text-gray-600 mb-6">
          Manage your farm operations, track earnings, view location data, and access support. 
          Perfect for farmers and agricultural sellers.
        </p>
        
        <ul class="space-y-2 mb-8">
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            Dashboard & Analytics
          </li>
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            Earnings Tracking
          </li>
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            Location Mapping
          </li>
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            24/7 Support
          </li>
        </ul>
        
        <div class="space-y-3">
          <a 
            href="/seller/auth/login" 
            class="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In as Seller
          </a>
          <a 
            href="/seller/auth/signup" 
            class="block w-full bg-blue-50 text-blue-600 text-center py-3 px-4 rounded-lg font-medium hover:bg-blue-100 transition-colors border border-blue-200"
          >
            Create Seller Account
          </a>
        </div>
      </div>

      <!-- Admin Portal Card -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-8 border border-gray-100">
        <div class="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
          <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Admin Portal</h3>
        <p class="text-gray-600 mb-6">
          Comprehensive system administration and oversight tools. 
          Monitor network performance and manage the entire platform.
        </p>
        
        <ul class="space-y-2 mb-8">
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            System Overview
          </li>
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            User Management
          </li>
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            Analytics & Reports
          </li>
          <li class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            Platform Controls
          </li>
        </ul>
        
        <div class="space-y-3">
          <a 
            href="/admin/auth/login" 
            class="block w-full bg-purple-600 text-white text-center py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Admin Sign In
          <!-- </a>
          <a 
            href="/admin/auth/signup" 
            class="block w-full bg-purple-50 text-purple-600 text-center py-3 px-4 rounded-lg font-medium hover:bg-purple-100 transition-colors border border-purple-200"
          >
            Request Admin Access
          </a> -->
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <section id="features" class="py-16">
      <div class="text-center mb-12">
        <h3 class="text-3xl font-bold text-gray-900 mb-4">Why Choose FarmNetworks?</h3>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Built by farmers, for farmers. Our platform combines cutting-edge technology with agricultural expertise.
        </p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h4 class="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h4>
          <p class="text-gray-600">Quick access to all your farm data and operations.</p>
        </div>
        
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h4 class="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h4>
          <p class="text-gray-600">Your data is protected with enterprise-grade security.</p>
        </div>
        
        <div class="text-center">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
          </div>
          <h4 class="text-xl font-semibold text-gray-900 mb-2">Smart Analytics</h4>
          <p class="text-gray-600">Make data-driven decisions with powerful insights.</p>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="bg-gray-900 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="flex items-center space-x-2 mb-4 md:mb-0">
          <div class="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
            </svg>
          </div>
          <span class="font-semibold">FarmNetworks</span>
        </div>
        
        <div class="text-sm text-gray-400">
          © 2024 FarmNetworks. All rights reserved.
        </div>
      </div>
    </div>
  </footer>
</div>