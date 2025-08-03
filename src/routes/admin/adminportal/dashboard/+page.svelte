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

  let currentTime = new Date().toLocaleString();
  let timeInterval;
  let unsubscribeRealtime;

  onMount(async () => {
    // Update current time every second
    timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleString();
    }, 1000);

    // Initial data fetch
    await fetchAllDashboardData();

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

<div class="min-h-screen bg-gray-50 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
      <div class="flex items-center space-x-4">
        {#if $isLoading}
          <div class="flex items-center text-gray-500">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        {/if}
        <p class="text-gray-500">Last updated: {currentTime}</p>
      </div>
    </div>

    <!-- Error Message -->
    {#if $error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline">{$error}</span>
      </div>
    {/if}

    <!-- Statistics Explanation
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
      <h3 class="text-lg font-semibold text-blue-900 mb-4">📊 Dashboard Statistics Explained</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
        <div>
          <h4 class="font-semibold mb-2">Device Status (Pie Chart):</h4>
          <ul class="space-y-1">
            <li>• <strong>Online Devices:</strong> Devices with motor_status = 1 (motor is running/active)</li>
            <li>• <strong>Offline Devices:</strong> Devices with motor_status = 0 (motor is stopped/inactive)</li>
            <li>• <strong>Percentage:</strong> Shows the proportion of online vs offline devices</li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-2">Key Metrics:</h4>
          <ul class="space-y-1">
            <li>• <strong>Total Devices:</strong> All registered IoT devices in the system</li>
            <li>• <strong>Active Masters:</strong> Gateways with status = 'active' (functioning properly)</li>
            <li>• <strong>Monthly Earnings:</strong> Total revenue from seller_earnings table</li>
            <li>• <strong>Online Devices:</strong> Devices currently operational (motor_status = 1)</li>
          </ul>
        </div>
      </div>
    </div> -->

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

    <!-- Gateway Management Link -->
    <!-- <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Gateway Management</h3>
      <div class="text-center">
        <p class="text-gray-600 mb-4">Manage your IoT gateways, block/unblock devices, and monitor network status.</p>
        <a href="/admin/adminportal/gateways" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          Manage Gateways
        </a>
      </div>
    </div> -->

    <!-- Recent Alerts -->
    <!-- <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">View All</button>
      </div>
      <div class="divide-y divide-gray-200">
        {#if $recentAlerts.length > 0}
          {#each $recentAlerts as alert}
            <div class="px-6 py-4 flex items-center">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 {getAlertColor(alert.type)}" fill="currentColor" viewBox="0 0 20 20">
                  {@html getAlertIcon(alert.type)}
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-gray-900">{alert.id}</p>
                <p class="text-sm text-gray-500">{alert.message}</p>
              </div>
              <div class="text-sm text-gray-500">
                {alert.time}
              </div>
            </div>
          {/each}
        {:else}
          <div class="px-6 py-8 text-center text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No alerts</h3>
            <p class="mt-1 text-sm text-gray-500">All systems are running smoothly.</p>
          </div>
        {/if}
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