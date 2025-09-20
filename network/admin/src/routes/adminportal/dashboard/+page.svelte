<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
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
  import { goto } from '$app/navigation';

  let currentTime = new Date().toLocaleString();
  let timeInterval;
  let unsubscribeRealtime;

  // Device data from database
  let devices = [];
  let gateways = [];
  let users = [];
  let subscriptions = [];
  let recentDeviceActivities = [];

  // Seller stats state
  let sellerStats = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  };
  let isLoadingSellerStats = false;

  // Gateway stats state
  let gatewayStats = {
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
    totalDevices: 0
  };
  let isLoadingGatewayStats = false;

  // Device insights
  let deviceInsights = {
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    blockedDevices: 0,
    errorDevices: 0,
    expiringSubscriptions: 0,
    deviceTypes: {},
    recentlyAdded: []
  };

  // Chart data
  let deviceStatusChartData = [];
  let deviceTypeChartData = [];
  let subscriptionStatusData = [];

  onMount(async () => {
    // Update current time every second
    timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleString();
    }, 1000);

    // Initial data fetch
    await fetchAllDashboardData();
    await fetchSellerStats();
    await fetchGatewayStats();
    await fetchDeviceInsights();

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

  // Fetch comprehensive device insights
  async function fetchDeviceInsights() {
    try {
      // Fetch devices
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (devicesError) throw devicesError;
      devices = devicesData || [];

      // Fetch gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('gateways')
        .select('*');

      if (gatewaysError) throw gatewaysError;
      gateways = gatewaysData || [];

      // Fetch subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subscriptionsError) throw subscriptionsError;
      subscriptions = subscriptionsData || [];

      // Calculate insights
      calculateDeviceInsights();
      
    } catch (err) {
      console.error('Error fetching device insights:', err);
    }
  }

  function calculateDeviceInsights() {
    // Basic stats
    deviceInsights.totalDevices = devices.length;
    deviceInsights.onlineDevices = devices.filter(d => d.motor_status === 1).length;
    deviceInsights.offlineDevices = devices.filter(d => d.motor_status === 0).length;
    deviceInsights.blockedDevices = devices.filter(d => d.is_blocked === true).length;
    deviceInsights.errorDevices = devices.filter(d => d.error_status > 0).length;

    // Device types distribution
    deviceInsights.deviceTypes = devices.reduce((acc, device) => {
      const type = device.device_type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Recently added devices (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    deviceInsights.recentlyAdded = devices.filter(d => 
      new Date(d.created_at || d.installation_date) > sevenDaysAgo
    ).slice(0, 5);

    // Expiring subscriptions (next 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    deviceInsights.expiringSubscriptions = subscriptions.filter(sub => {
      const expiryDate = new Date(sub.valid_until);
      return expiryDate > now && expiryDate < sevenDaysFromNow;
    }).length;

    // Update chart data
    updateChartData();
  }

  function updateChartData() {
    // Device status chart data
    deviceStatusChartData = [
      { name: 'Online', value: deviceInsights.onlineDevices, color: '#10B981' },
      { name: 'Offline', value: deviceInsights.offlineDevices, color: '#EF4444' },
      { name: 'Blocked', value: deviceInsights.blockedDevices, color: '#F59E0B' },
      { name: 'Error', value: deviceInsights.errorDevices, color: '#8B5CF6' }
    ];

    // Device type chart data
    deviceTypeChartData = Object.entries(deviceInsights.deviceTypes).map(([type, count]) => ({
      name: type,
      value: count,
      color: getColorForDeviceType(type)
    }));

    // Subscription status data
    const activeSubscriptions = subscriptions.filter(sub => new Date(sub.valid_until) > new Date()).length;
    const expiredSubscriptions = subscriptions.filter(sub => new Date(sub.valid_until) <= new Date()).length;
    
    subscriptionStatusData = [
      { name: 'Active', value: activeSubscriptions, color: '#10B981' },
      { name: 'Expired', value: expiredSubscriptions, color: '#EF4444' },
      { name: 'Expiring Soon', value: deviceInsights.expiringSubscriptions, color: '#F59E0B' }
    ];
  }

  function getColorForDeviceType(type) {
    const colors = {
      'motor_controller': '#3B82F6',
      'sensor': '#10B981', 
      'gateway': '#8B5CF6',
      'Unknown': '#6B7280'
    };
    return colors[type] || '#6B7280';
  }

  // Fetch seller statistics
  async function fetchSellerStats() {
    isLoadingSellerStats = true;
    
    try {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('seller_profiles')
        .select('id', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get approved count
      const { count: approvedCount, error: approvedError } = await supabase
        .from('seller_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      if (approvedError) throw approvedError;

      // Get pending count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('seller_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (pendingError) throw pendingError;

      // Get rejected count
      const { count: rejectedCount, error: rejectedError } = await supabase
        .from('seller_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'rejected');

      if (rejectedError) throw rejectedError;

      sellerStats = {
        total: totalCount || 0,
        approved: approvedCount || 0,
        pending: pendingCount || 0,
        rejected: rejectedCount || 0
      };
    } catch (err) {
      console.error('Error fetching seller stats:', err);
    } finally {
      isLoadingSellerStats = false;
    }
  }

  // Fetch gateway statistics
  async function fetchGatewayStats() {
    isLoadingGatewayStats = true;
    
    try {
      // Get total gateway count
      const { count: totalCount, error: totalError } = await supabase
        .from('gateways')
        .select('id', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get active gateway count
      const { count: activeCount, error: activeError } = await supabase
        .from('gateways')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (activeError) throw activeError;

      // Get inactive gateway count
      const { count: inactiveCount, error: inactiveError } = await supabase
        .from('gateways')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'inactive');

      if (inactiveError) throw inactiveError;

      // Get maintenance gateway count
      const { count: maintenanceCount, error: maintenanceError } = await supabase
        .from('gateways')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'maintenance');

      if (maintenanceError) throw maintenanceError;

      // Get total devices connected to gateways
      const { count: totalDevicesCount, error: devicesError } = await supabase
        .from('devices')
        .select('id', { count: 'exact', head: true })
        .not('gateway_id', 'is', null);

      if (devicesError) throw devicesError;

      gatewayStats = {
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: inactiveCount || 0,
        maintenance: maintenanceCount || 0,
        totalDevices: totalDevicesCount || 0
      };
    } catch (err) {
      console.error('Error fetching gateway stats:', err);
    } finally {
      isLoadingGatewayStats = false;
    }
  }

  // Navigation functions
  function goToDevicePage() {
    goto('/admin/adminportal/devices/');
  }

  function goToSellersPage() {
    goto('/admin/adminportal/sellers/');
  }

  function goToGatewaysPage() {
    goto('/admin/adminportal/gateways/');
  }

  function getChangeColor(change) {
    return change.startsWith('+') ? 'text-green-600' : 'text-red-600';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Generate pie chart path for SVG
  function generatePieChartPath(data, startAngle = 0) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];
    
    let currentAngle = startAngle;
    const radius = 70;
    const centerX = 90;
    const centerY = 90;
    
    return data.map(item => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      
      const startX = centerX + radius * Math.cos((currentAngle - 90) * Math.PI / 180);
      const startY = centerY + radius * Math.sin((currentAngle - 90) * Math.PI / 180);
      
      const endAngle = currentAngle + angle;
      const endX = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
      const endY = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const pathData = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
      
      currentAngle = endAngle;
      
      return {
        ...item,
        path: pathData,
        percentage: percentage.toFixed(1)
      };
    });
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

    <!-- Current Time Display -->
    <div class="text-right text-sm text-gray-500 mb-4">
      Last updated: {currentTime}
    </div>

    <!-- Top Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total Devices - Clickable -->
      <div class="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" on:click={goToDevicePage}>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Devices</p>
            <p class="text-3xl font-bold text-gray-900">{deviceInsights.totalDevices.toLocaleString()}</p>
            <p class="text-sm text-blue-600 mt-1">Click to manage</p>
          </div>
          <div class="bg-blue-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Online Devices - Clickable -->
      <div class="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" on:click={goToDevicePage}>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Online Devices</p>
            <p class="text-3xl font-bold text-gray-900">{deviceInsights.onlineDevices}</p>
            <p class="text-sm text-green-600 mt-1">
              {deviceInsights.totalDevices > 0 ? `${Math.round((deviceInsights.onlineDevices / deviceInsights.totalDevices) * 100)}%` : '0%'} operational
            </p>
          </div>
          <div class="bg-green-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Issues Alert - Clickable -->
      <div class="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" 
           class:bg-red-50={deviceInsights.offlineDevices > 0 || deviceInsights.errorDevices > 0}
           on:click={goToDevicePage}>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Device Issues</p>
            <p class="text-3xl font-bold text-gray-900">{deviceInsights.offlineDevices + deviceInsights.errorDevices}</p>
            <p class="text-sm text-red-600 mt-1">
              {deviceInsights.offlineDevices} offline, {deviceInsights.errorDevices} errors
            </p>
          </div>
          <div class="bg-red-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Pending Sellers Card - Clickable -->
      <div class="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
           class:bg-orange-50={sellerStats.pending > 0}
           on:click={goToSellersPage}>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Pending Approvals</p>
            <p class="text-3xl font-bold text-gray-900">{sellerStats.pending}</p>
            <p class="text-sm text-orange-600 mt-1">
              {sellerStats.pending === 0 ? 'All caught up!' : 'Needs attention'}
            </p>
          </div>
          <div class="bg-orange-100 p-3 rounded-lg">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Device Status Section with Recent Devices -->
    


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

      <!-- Subscription Status Chart -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
        <div class="flex items-center justify-center h-64">
          {#if subscriptionStatusData.length > 0}
            {@const chartPaths = generatePieChartPath(subscriptionStatusData)}
            <div class="relative">
              <svg width="180" height="180" viewBox="0 0 180 180">
                {#each chartPaths as item}
                  <path d={item.path} fill={item.color} opacity="0.8" />
                {/each}
                <text x="90" y="85" text-anchor="middle" class="text-lg font-bold fill-gray-900">
                  {subscriptions.length}
                </text>
                <text x="90" y="100" text-anchor="middle" class="text-sm fill-gray-600">
                  Total Plans
                </text>
              </svg>
            </div>
          {:else}
            <div class="text-gray-500">No subscription data</div>
          {/if}
        </div>
        <div class="flex justify-center space-x-6 mt-4">
          {#each subscriptionStatusData as item}
            <div class="flex items-center">
              <div class="w-4 h-4 rounded mr-2" style="background-color: {item.color}"></div>
              <span class="text-sm text-gray-600">
                {item.name} ({item.value})
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Gateway Statistics Section -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <div class="bg-purple-100 p-2 rounded-lg mr-3">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Gateway Management</h3>
            <p class="text-sm text-gray-600">Network infrastructure overview</p>
          </div>
        </div>
        <button
          on:click={goToGatewaysPage}
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          Manage Gateways
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Total Gateways -->
        <div class="bg-gradient-to-br  rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" on:click={goToGatewaysPage}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Total Gateways</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingGatewayStats}
                  <div class="animate-pulse bg-purple-300 h-6 w-12 rounded"></div>
                {:else}
                  {gatewayStats.total}
                {/if}
              </p>
            </div>
            <div class="bg-purple-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Active Gateways -->
        <div class="bg-gradient-to-br  rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Active</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingGatewayStats}
                  <div class="animate-pulse bg-green-300 h-6 w-12 rounded"></div>
                {:else}
                  {gatewayStats.active}
                {/if}
              </p>
              <p class="text-xs text-green-600 mt-1">
                {gatewayStats.total > 0 ? `${Math.round((gatewayStats.active / gatewayStats.total) * 100)}%` : '0%'} online
              </p>
            </div>
            <div class="bg-green-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Inactive Gateways -->
        <div class="bg-gradient-to-br  rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Inactive</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingGatewayStats}
                  <div class="animate-pulse bg-red-300 h-6 w-12 rounded"></div>
                {:else}
                  {gatewayStats.inactive}
                {/if}
              </p>
              <p class="text-xs text-red-600 mt-1">
                {gatewayStats.inactive > 0 ? 'Needs attention' : 'All operational'}
              </p>
            </div>
            <div class="bg-red-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Connected Devices -->
        <div class="bg-gradient-to-br  rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Connected Devices</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingGatewayStats}
                  <div class="animate-pulse bg-blue-300 h-6 w-12 rounded"></div>
                {:else}
                  {gatewayStats.totalDevices}
                {/if}
              </p>
              <p class="text-xs text-blue-600 mt-1">Via gateways</p>
            </div>
            <div class="bg-blue-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Gateway Status Summary -->
      <!-- {#if !isLoadingGatewayStats}
        <div class="mt-6 pt-6 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span class="text-sm text-gray-600">{gatewayStats.active} Active</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span class="text-sm text-gray-600">{gatewayStats.inactive} Inactive</span>
              </div>
              {#if gatewayStats.maintenance > 0}
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span class="text-sm text-gray-600">{gatewayStats.maintenance} Maintenance</span>
                </div>
              {/if}
            </div>
            <div class="text-sm text-gray-500">
              Network Coverage: {gatewayStats.active > 0 ? 'Active' : 'Limited'}
            </div>
          </div>
        </div>
      {/if} -->
    </div>

    <!-- Enhanced Seller Management Section -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <div class="bg-indigo-100 p-2 rounded-lg mr-3">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Seller Management</h3>
            <p class="text-sm text-gray-600">Manage seller profiles and approvals</p>
          </div>
        </div>
        <button
          on:click={goToSellersPage}
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
          Manage Sellers
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Total Sellers -->
        <div class="bg-gradient-to-br  rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" on:click={goToSellersPage}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Total Sellers</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingSellerStats}
                  <div class="animate-pulse bg-indigo-300 h-6 w-12 rounded"></div>
                {:else}
                  {sellerStats.total}
                {/if}
              </p>
              <p class="text-xs text-indigo-600 mt-1">All registered</p>
            </div>
            <div class="bg-indigo-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Approved Sellers -->
        <div class="bg-gradient-to-br  rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" on:click={goToSellersPage}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Approved</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingSellerStats}
                  <div class="animate-pulse bg-green-300 h-6 w-12 rounded"></div>
                {:else}
                  {sellerStats.approved}
                {/if}
              </p>
              <p class="text-xs text-green-600 mt-1">
                {sellerStats.total > 0 ? `${Math.round((sellerStats.approved / sellerStats.total) * 100)}%` : '0%'} approved
              </p>
            </div>
            <div class="bg-green-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Pending Sellers -->
        <div class="bg-gradient-to-br  rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" on:click={goToSellersPage}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Pending Review</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingSellerStats}
                  <div class="animate-pulse bg-orange-300 h-6 w-12 rounded"></div>
                {:else}
                  {sellerStats.pending}
                {/if}
              </p>
              <p class="text-xs text-orange-600 mt-1">
                {sellerStats.pending === 0 ? 'All reviewed' : 'Action needed'}
              </p>
            </div>
            <div class="bg-orange-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Rejected Sellers -->
        <div class="bg-gradient-to-br  rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" on:click={goToSellersPage}>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Rejected</p>
              <p class="text-2xl font-bold text-gray-900">
                {#if isLoadingSellerStats}
                  <div class="animate-pulse bg-red-300 h-6 w-12 rounded"></div>
                {:else}
                  {sellerStats.rejected}
                {/if}
              </p>
              <p class="text-xs text-red-600 mt-1">
                {sellerStats.rejected === 0 ? 'None rejected' : 'Review needed'}
              </p>
            </div>
            <div class="bg-red-200 p-2 rounded-lg">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Seller Approval Flow -->
      <!-- {#if !isLoadingSellerStats}
        <div class="mt-6 pt-6 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-8">
              <div class="text-center">
                <div class="w-10 h-10  rounded-full flex items-center justify-center mx-auto mb-2">
                  <span class="text-blue-600 font-bold">{sellerStats.total}</span>
                </div>
                <span class="text-xs text-gray-600">Registered</span>
              </div>
              <div class="flex-1 h-0.5 bg-gray-300"></div>
              <div class="text-center">
                <div class="w-10 h-10  rounded-full flex items-center justify-center mx-auto mb-2">
                  <span class="text-orange-600 font-bold">{sellerStats.pending}</span>
                </div>
                <span class="text-xs text-gray-600">Pending</span>
              </div>
              <div class="flex-1 h-0.5 bg-gray-300"></div>
              <div class="text-center">
                <div class="w-10 h-10  rounded-full flex items-center justify-center mx-auto mb-2">
                  <span class="text-green-600 font-bold">{sellerStats.approved}</span>
                </div>
                <span class="text-xs text-gray-600">Approved</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-gray-900">
                Approval Rate: {sellerStats.total > 0 ? Math.round((sellerStats.approved / sellerStats.total) * 100) : 0}%
              </div>
              <div class="text-xs text-gray-500">
                {sellerStats.pending} awaiting review
              </div>
            </div>
          </div>
        </div>
      {/if} -->
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Device Status Distribution -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Device Status</h3>
          <button class="text-blue-600 hover:text-blue-800 text-sm" on:click={goToDevicePage}>
            View All →
          </button>
        </div>
        <div class="flex items-center justify-center h-48">
          {#if deviceStatusChartData.length > 0}
            {@const chartPaths = generatePieChartPath(deviceStatusChartData)}
            <div class="relative">
              <svg width="180" height="180" viewBox="0 0 180 180">
                {#each chartPaths as item}
                  <path d={item.path} fill={item.color} opacity="0.8" />
                {/each}
                <text x="90" y="85" text-anchor="middle" class="text-lg font-bold fill-gray-900">
                  {deviceInsights.totalDevices}
                </text>
                <text x="90" y="100" text-anchor="middle" class="text-sm fill-gray-600">
                  Total Devices
                </text>
              </svg>
            </div>
          {:else}
            <div class="text-gray-500">No data available</div>
          {/if}
        </div>
        <div class="grid grid-cols-2 gap-2 mt-4">
          {#each deviceStatusChartData as item}
            <div class="flex items-center">
              <div class="w-3 h-3 rounded mr-2" style="background-color: {item.color}"></div>
              <span class="text-sm text-gray-600">{item.name} ({item.value})</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Recently Added Devices -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Recent Devices</h3>
          <span class="text-sm text-gray-500">Last 7 days</span>
        </div>
        <div class="space-y-3">
          {#if deviceInsights.recentlyAdded.length > 0}
            {#each deviceInsights.recentlyAdded as device}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div class="font-medium text-gray-900">{device.device_id}</div>
                  <div class="text-sm text-gray-600">{device.device_name || 'Unnamed'}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-green-600">
                    {device.motor_status === 1 ? 'Online' : 'Offline'}
                  </div>
                  <div class="text-xs text-gray-500">
                    {formatDate(device.created_at || device.installation_date)}
                  </div>
                </div>
              </div>
            {/each}
          {:else}
            <div class="text-center text-gray-500 py-8">
              No recent devices added
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          on:click={goToDevicePage}
        >
          <div class="text-center">
            <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            <div class="text-sm font-medium text-gray-900">Manage Devices</div>
            <div class="text-xs text-gray-500">View all devices</div>
          </div>
        </button>
        
        <button 
          class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          on:click={goToSellersPage}
        >
          <div class="text-center">
            <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <div class="text-sm font-medium text-gray-900">Review Sellers</div>
            <div class="text-xs text-gray-500">
              {sellerStats.pending > 0 ? `${sellerStats.pending} pending` : 'All reviewed'}
            </div>
          </div>
        </button>
        
        <button 
          class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          on:click={goToGatewaysPage}
        >
          <div class="text-center">
            <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
            </svg>
            <div class="text-sm font-medium text-gray-900">Check Gateways</div>
            <div class="text-xs text-gray-500">
              {gatewayStats.inactive > 0 ? `${gatewayStats.inactive} offline` : 'All online'}
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    {#if $isLoading}
      <div class="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
          <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-gray-900 font-medium">Loading dashboard data...</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }

  /* Hover animations */
  .hover\:scale-105:hover {
    transform: scale(1.05);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .grid.grid-cols-1.md\:grid-cols-4 {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .grid.grid-cols-1.lg\:grid-cols-3 {
      grid-template-columns: 1fr;
    }
  }
</style>