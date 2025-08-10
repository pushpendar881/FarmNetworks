<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    dashboardOverview,
    monthlyGrowthData,
    recentAlerts,
    deviceStatusData,
    deviceStatusPercentages,
    isLoading,
    error,
    fetchAllDashboardData,
    startAutoRefresh,
    stopAutoRefresh,
    subscribeToDeviceUpdates
  } from '$lib/stores/admin/dashboard.js';
  import Header from '$lib/components/Header.svelte';
  import { supabase } from '$lib/supabase.js';

  let currentTime = new Date().toLocaleString();
  let timeInterval;
  let unsubscribeRealtime;

  // Commission management state
  let currentCommission = 0;
  let newCommissionRate = 0;
  let isUpdatingCommission = false;
  let commissionError = null;
  let commissionSuccess = false;

  onMount(async () => {
    // Update current time every second
    timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleString();
    }, 1000);

    // Initial data fetch
    await fetchAllDashboardData();
    await fetchCurrentCommission();

    // Start auto-refresh every 30 seconds
    startAutoRefresh(30000);

    // Subscribe to real-time updates
    unsubscribeRealtime = subscribeToDeviceUpdates();
  });

  onDestroy(() => {
    if (timeInterval) {
      clearInterval(timeInterval);
    }
    stopAutoRefresh();
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }
  });

  // Alternative approach using JavaScript only (without SQL function)

async function updateCommissionAlternative() {
  // Validation
  if (newCommissionRate < 0 || newCommissionRate > 100) {
    commissionError = 'Commission rate must be between 0% and 100%';
    return;
  }

  if (newCommissionRate === currentCommission) {
    commissionError = 'New rate is same as current rate';
    return;
  }

  isUpdatingCommission = true;
  commissionError = null;
  commissionSuccess = false;

  try {
    // Step 1: Get current active commission (if any)
    const { data: currentCommissions, error: fetchError } = await supabase
      .from('commissions')
      .select('id')
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    // Step 2: Deactivate current active commissions (if any exist)
    if (currentCommissions && currentCommissions.length > 0) {
      const commissionIds = currentCommissions.map(c => c.id);
      
      const { error: deactivateError } = await supabase
        .from('commissions')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .in('id', commissionIds);

      if (deactivateError) throw deactivateError;
    }

    // Step 3: Insert new active commission
    const { error: insertError } = await supabase
      .from('commissions')
      .insert({
        rate: newCommissionRate,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    // Update local state
    currentCommission = newCommissionRate;
    commissionSuccess = true;

    // Clear success message after 3 seconds
    setTimeout(() => {
      commissionSuccess = false;
    }, 3000);

  } catch (err) {
    console.error('Error updating commission:', err);
    
    // Handle specific error types
    if (err.code === '23505') { // Unique constraint violation
      commissionError = 'Commission update failed due to a conflict. Please refresh and try again.';
    } else if (err.code === '23514') { // Check constraint violation
      commissionError = 'Invalid commission rate. Must be between 0 and 100.';
    } else if (err.message.includes('duplicate key')) {
      commissionError = 'Another active commission already exists. Please refresh and try again.';
    } else {
      commissionError = `Failed to update commission rate: ${err.message}`;
    }
  } finally {
    isUpdatingCommission = false;
  }
}

// Also update the fetchCurrentCommission function to be more robust
async function fetchCurrentCommissionRobust() {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('rate, id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      currentCommission = parseFloat(data[0].rate);
      newCommissionRate = currentCommission;
      
      // If there are multiple active commissions (shouldn't happen but just in case)
      if (data.length > 1) {
        console.warn('Multiple active commissions found. This should not happen.');
      }
    } else {
      // No active commission found, set default
      currentCommission = 0;
      newCommissionRate = 0;
    }
  } catch (err) {
    console.error('Error fetching commission:', err);
    commissionError = 'Failed to fetch current commission rate';
    
    // Set defaults on error
    currentCommission = 0;
    newCommissionRate = 0;
  }
}

  function resetCommissionForm() {
    newCommissionRate = currentCommission;
    commissionError = null;
    commissionSuccess = false;
  }

  function getChangeColor(change) {
    return change.startsWith('+') ? 'text-green-600' : 'text-red-600';
  }

  function getAlertIcon(type) {
    if (type === 'offline') {
      return `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>`;
    } else if (type === 'recharge') {
      return `<path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>`;
    }
    // Default warning icon
    return `<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>`;
  }

  function getAlertColor(type) {
    if (type === 'offline') return 'text-red-500';
    if (type === 'recharge') return 'text-orange-500';
    return 'text-yellow-500';
  }
</script>

<Header title="Dashboard" />

<div class="min-h-screen bg-gray-50 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Error Message -->
    {#if $error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline">{$error}</span>
      </div>
    {/if}

    <!-- Commission Management Section -->
  

    <!-- Top Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total Devices -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Devices</p>
            <p class="text-3xl font-bold text-gray-900">{$dashboardOverview.totalDevices.toLocaleString()}</p>
            <p class="text-sm {getChangeColor($dashboardOverview.totalDevicesChange)} mt-1">
              {$dashboardOverview.totalDevicesChange} from last month
            </p>
          </div>
          <div class="bg-blue-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Active Masters -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Active Masters</p>
            <p class="text-3xl font-bold text-gray-900">{$dashboardOverview.activeMasters}</p>
            <p class="text-sm {getChangeColor($dashboardOverview.activeMastersChange)} mt-1">
              {$dashboardOverview.activeMastersChange} from last month
            </p>
          </div>
          <div class="bg-green-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Monthly Earnings -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Monthly Earnings</p>
            <p class="text-3xl font-bold text-gray-900">${$dashboardOverview.monthlyEarnings.toLocaleString()}</p>
            <p class="text-sm {getChangeColor($dashboardOverview.monthlyEarningsChange)} mt-1">
              {$dashboardOverview.monthlyEarningsChange} from last month
            </p>
          </div>
          <div class="bg-green-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Online Devices -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Online Devices</p>
            <p class="text-3xl font-bold text-gray-900">{$dashboardOverview.onlineDevices}</p>
            <p class="text-sm {getChangeColor($dashboardOverview.onlineDevicesChange)} mt-1">
              {$dashboardOverview.onlineDevicesChange} from last month
            </p>
          </div>
          <div class="bg-green-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Monthly Growth Chart -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Monthly Growth (Devices Added)</h3>
        <div class="h-64">
          {#if $monthlyGrowthData.length > 0}
            <svg width="100%" height="100%" viewBox="0 0 400 200" class="overflow-visible">
              {#each $monthlyGrowthData as item, i}
                {@const maxValue = Math.max(...$monthlyGrowthData.map(d => d.value))}
                {@const barHeight = maxValue > 0 ? (item.value / maxValue) * 150 : 0}
                <rect
                  x={50 + i * 50}
                  y={180 - barHeight}
                  width="35"
                  height={barHeight}
                  fill="#3B82F6"
                  rx="2"
                />
                <text
                  x={67 + i * 50}
                  y={195}
                  text-anchor="middle"
                  class="text-xs fill-gray-600"
                >
                  {item.month}
                </text>
                <text
                  x={67 + i * 50}
                  y={175 - barHeight}
                  text-anchor="middle"
                  class="text-xs fill-gray-900 font-medium"
                >
                  {item.value}
                </text>
              {/each}
            </svg>
          {:else}
            <div class="flex items-center justify-center h-full text-gray-500">
              No data available
            </div>
          {/if}
        </div>
      </div>

      <!-- Device Status Pie Chart -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Device Status (Based on Motor Status)</h3>
        <div class="flex items-center justify-center h-64">
          <div class="relative">
            {#if $deviceStatusPercentages}
              {@const onlinePercent = $deviceStatusPercentages.online}
              {@const offlinePercent = $deviceStatusPercentages.offline}
              {@const onlineCircumference = (onlinePercent / 100) * 439.82}
              {@const offlineCircumference = (offlinePercent / 100) * 439.82}
              
              <svg width="180" height="180" viewBox="0 0 180 180">
                <!-- Online devices -->
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  fill="none"
                  stroke="#10B981"
                  stroke-width="20"
                  stroke-dasharray="{onlineCircumference} {439.82 - onlineCircumference}"
                  stroke-dashoffset="0"
                  transform="rotate(-90 90 90)"
                />
                <!-- Offline devices -->
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  fill="none"
                  stroke="#EF4444"
                  stroke-width="20"
                  stroke-dasharray="{offlineCircumference} {439.82 - offlineCircumference}"
                  stroke-dashoffset="-{onlineCircumference}"
                  transform="rotate(-90 90 90)"
                />
                
                <!-- Center text -->
                <text x="90" y="85" text-anchor="middle" class="text-lg font-bold fill-gray-900">
                  {$deviceStatusData.online + $deviceStatusData.offline}
                </text>
                <text x="90" y="100" text-anchor="middle" class="text-sm fill-gray-600">
                  Total Devices
                </text>
              </svg>
            {/if}
          </div>
        </div>
        <div class="flex justify-center space-x-6 mt-4">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span class="text-sm text-gray-600">Online: {$deviceStatusData.online} ({$deviceStatusPercentages.online}%)</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span class="text-sm text-gray-600">Offline: {$deviceStatusData.offline} ({$deviceStatusPercentages.offline}%)</span>
          </div>
        </div>
        <div class="mt-4 text-xs text-gray-500 text-center">
          <p><strong>Note:</strong> Online = motor_status = 1, Offline = motor_status = 0</p>
        </div>

      </div>
    </div>

    <!-- <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Commission Management</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Current Commission Display 
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-medium text-gray-700">Current Commission Rate</h4>
              <p class="text-3xl font-bold text-indigo-600">{currentCommission}%</p>
              <p class="text-sm text-gray-500 mt-1">Applied to all new subscriptions</p>
            </div>
            <div class="bg-indigo-100 p-3 rounded-full">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Update Commission Form 
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 class="text-sm font-medium text-gray-700 mb-4">Update Commission Rate</h4>
          
          <!-- Success Message 
          {#if commissionSuccess}
            <div class="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-4 text-sm">
              ✅ Commission rate updated successfully!
            </div>
          {/if}

          <!-- Error Message 
          {#if commissionError}
            <div class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              ❌ {commissionError}
            </div>
          {/if}

          <div class="space-y-4">
            <div>
              <label for="commission-rate" class="block text-sm font-medium text-gray-700 mb-2">
                New Commission Rate (%)
              </label>
              <div class="relative">
                <input
                  id="commission-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  bind:value={newCommissionRate}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter rate (0-100)"
                  disabled={isUpdatingCommission}
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span class="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-1">Enter a value between 0 and 100</p>
            </div>

            <div class="flex space-x-3">
              <button
                on:click={updateCommission}
                disabled={isUpdatingCommission || newCommissionRate === currentCommission}
                class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {#if isUpdatingCommission}
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                {:else}
                  Update Rate
                {/if}
              </button>

              <button
                on:click={resetCommissionForm}
                disabled={isUpdatingCommission}
                class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Commission Info 
      <div class="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          </svg>
          <div>
            <h4 class="text-sm font-medium text-blue-900">Important Information</h4>
            <div class="mt-1 text-sm text-blue-800">
              <ul class="list-disc list-inside space-y-1">
                <li>Commission changes apply to all new subscriptions immediately</li>
                <li>Existing subscriptions retain their original commission rate</li>
                <li>All commission rate changes are logged for audit purposes</li>
                <li>Rate must be between 0% and 100%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div> -->
  </div>
</div>

<style>
  /* Custom styles for better visual appeal */
  .text-xs {
    font-size: 0.75rem;
    line-height: 1rem;
  }
</style>