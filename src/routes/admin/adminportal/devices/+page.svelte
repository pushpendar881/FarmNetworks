<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabase.js';

  // Device data from database
  let devices = [];
  let gateways = [];
  let users = [];
  let subscriptions = [];
  let loading = true;
  let error = null;

  // Filter states
  let searchTerm = '';
  let statusFilter = 'all';
  let gatewayFilter = 'all';
  let deviceTypeFilter = 'all';
  let showMoreFilters = false;

  // Calculate stats
  $: totalDevices = devices.length;
  $: onlineDevices = devices.filter(d => d.motor_status === 1).length;
  $: offlineDevices = devices.filter(d => d.motor_status === 0).length;
  $: expiringDevices = subscriptions.filter(sub => {
    const expiryDate = new Date(sub.valid_until);
    const now = new Date();
    const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }).length;

  // Filter devices
  $: filteredDevices = devices.filter(device => {
    const matchesSearch = device.device_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.farm_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && device.motor_status === 1) ||
                         (statusFilter === 'offline' && device.motor_status === 0);
    const matchesGateway = gatewayFilter === 'all' || device.gateway_id === gatewayFilter;
    const matchesType = deviceTypeFilter === 'all' || device.device_type === deviceTypeFilter;
    
    return matchesSearch && matchesStatus && matchesGateway && matchesType;
  });

  // Get gateway name by ID
  function getGatewayName(gatewayId) {
    const gateway = gateways.find(g => g.id === gatewayId);
    return gateway ? gateway.name : 'Unknown Gateway';
  }

  // Get user name by ID
  function getUserName(userId) {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  }

  // Get subscription info for device
  function getSubscriptionInfo(deviceId) {
    const subscription = subscriptions.find(sub => sub.device_id === deviceId);
    if (!subscription) return { expires: null, expired: true, plan: 'No Plan' };
    
    const expiryDate = new Date(subscription.valid_until);
    const now = new Date();
    const expired = expiryDate < now;
    
    return {
      expires: subscription.valid_until,
      expired,
      plan: subscription.plan_name,
      planType: subscription.plan_type
    };
  }

  // Fetch all devices with related data
  async function fetchDevices() {
    try {
      loading = true;
      error = null;

      // Fetch devices
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*');

      if (devicesError) throw devicesError;
      devices = devicesData || [];

      // Fetch gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('gateways')
        .select('*');

      if (gatewaysError) throw gatewaysError;
      gateways = gatewaysData || [];

      // Fetch user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');

      if (usersError) throw usersError;
      users = usersData || [];

      // Fetch subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subscriptionsError) throw subscriptionsError;
      subscriptions = subscriptionsData || [];

    } catch (err) {
      console.error('Error fetching devices:', err);
      error = 'Failed to load devices data';
    } finally {
      loading = false;
    }
  }

  function handleExport() {
    console.log('Exporting data...');
    // TODO: Implement CSV export functionality
  }

  function viewDetails(deviceId) {
    console.log('Viewing details for:', deviceId);
    // TODO: Navigate to device details page
  }

  function toggleMoreFilters() {
    showMoreFilters = !showMoreFilters;
  }

  onMount(() => {
    fetchDevices();
  });
</script>

<div class="device-management">
  <!-- Header -->
  <!-- <div class="page-header" in:fade={{ delay: 100 }}>
    <div class="header-top">
      <span class="welcome-text">Welcome back, Admin</span>
      <div class="user-actions">
        <button class="notification-btn">🔔</button>
        <div class="user-profile">
          <span class="user-avatar">👤</span>
          <span class="user-name">Admin</span>
        </div>
      </div>
    </div>
    
    <div class="page-title-section">
      <h1>Device Management</h1>
      <button class="export-btn" on:click={handleExport}>
        ⬇️ Export Data
      </button>
    </div>
  </div> -->

  <!-- Filters Section -->
  <div class="filters-section" in:fade={{ delay: 200 }}>
    <div class="search-filter">
      <span class="filter-label">Search Devices</span>
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Search by Device ID, Name, or Farm"
          bind:value={searchTerm}
        />
      </div>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Status Filter</span>
      <select bind:value={statusFilter}>
        <option value="all">All Status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Gateway Filter</span>
      <select bind:value={gatewayFilter}>
        <option value="all">All Gateways</option>
        {#each gateways as gateway}
          <option value={gateway.id}>{gateway.name}</option>
        {/each}
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Device Type</span>
      <select bind:value={deviceTypeFilter}>
        <option value="all">All Types</option>
        <option value="motor_controller">Motor Controller</option>
        <option value="sensor">Sensor</option>
        <option value="gateway">Gateway</option>
      </select>
    </div>

    <button class="more-filters-btn" on:click={toggleMoreFilters}>
      🔽 More Filters
    </button>
  </div>

  <!-- Stats Cards -->
  <div class="stats-section" in:fly={{ y: 30, delay: 400 }}>
    <div class="stat-card">
      <div class="stat-icon">📱</div>
      <div class="stat-content">
        <div class="stat-label">Total Devices</div>
        <div class="stat-value">{totalDevices}</div>
      </div>
    </div>

    <div class="stat-card online">
      <div class="stat-icon">📶</div>
      <div class="stat-content">
        <div class="stat-label">Online</div>
        <div class="stat-value">{onlineDevices}</div>
      </div>
    </div>

    <div class="stat-card offline">
      <div class="stat-icon">📵</div>
      <div class="stat-content">
        <div class="stat-label">Offline</div>
        <div class="stat-value">{offlineDevices}</div>
      </div>
    </div>

    <div class="stat-card warning">
      <div class="stat-icon">⚠️</div>
      <div class="stat-content">
        <div class="stat-label">Expiring Soon</div>
        <div class="stat-value">{expiringDevices}</div>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-section" in:fade={{ delay: 300 }}>
      <div class="loading-spinner"></div>
      <p>Loading devices data...</p>
    </div>
  {:else if error}
    <div class="error-section" in:fade={{ delay: 300 }}>
      <p>❌ {error}</p>
      <button class="retry-btn" on:click={fetchDevices}>Retry</button>
    </div>
  {:else}
    <!-- Devices Table -->
    <div class="table-section" in:fly={{ y: 30, delay: 600 }}>
      <div class="table-container">
        <table class="devices-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" class="checkbox" />
              </th>
              <th>DEVICE INFO</th>
              <th>GATEWAY</th>
              <th>USER</th>
              <th>STATUS</th>
              <th>LAST ACTIVE</th>
              <th>SUBSCRIPTION</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredDevices as device, i}
              {@const subscriptionInfo = getSubscriptionInfo(device.device_id)}
              {@const gatewayName = getGatewayName(device.gateway_id)}
              {@const userName = getUserName(device.user_id)}
              <tr class="device-row" in:fly={{ x: 30, delay: 800 + (i * 100) }}>
                <td>
                  <input type="checkbox" class="checkbox" />
                </td>
                <td class="device-info">
                  <div class="device-details">
                    <div class="device-id">{device.device_id}</div>
                    <div class="device-name">{device.device_name || 'Unnamed Device'}</div>
                    <div class="device-installed">
                      Installed: {device.installation_date ? new Date(device.installation_date).toLocaleDateString() : 'Unknown'}
                    </div>
                    <div class="device-farm">{device.farm_name || 'No Farm'}</div>
                  </div>
                </td>
                <td class="gateway-info">
                  <div class="gateway-details">
                    <div class="gateway-name">{gatewayName}</div>
                    <div class="gateway-id">{device.gateway_id}</div>
                  </div>
                </td>
                <td class="user-info">
                  <div class="user-details">
                    <div class="user-name">{userName}</div>
                    <div class="user-id">{device.user_id}</div>
                  </div>
                </td>
                <td class="status-cell">
                  <div class="status-badge" class:online={device.motor_status === 1} class:offline={device.motor_status === 0}>
                    <span class="status-icon">{device.motor_status === 1 ? '📶' : '📵'}</span>
                    <span class="status-text">{device.motor_status === 1 ? 'Online' : 'Offline'}</span>
                  </div>
                  {#if device.error_status > 0}
                    <div class="error-badge">⚠️ Error</div>
                  {/if}
                </td>
                <td class="last-active">
                  {device.last_updated ? new Date(device.last_updated).toLocaleString() : 'Never'}
                </td>
                <td class="subscription-info">
                  <div class="subscription-details">
                    <div class="plan-name">{subscriptionInfo.plan}</div>
                    <div class="plan-type">{subscriptionInfo.planType}</div>
                    {#if subscriptionInfo.expires}
                      <div class="expires-date">
                        🔋 Expires: {new Date(subscriptionInfo.expires).toLocaleDateString()}
                      </div>
                      {#if subscriptionInfo.expired}
                        <div class="expired-badge">Expired</div>
                      {:else}
                        <div class="active-badge">Active</div>
                      {/if}
                    {:else}
                      <div class="no-plan-badge">No Plan</div>
                    {/if}
                  </div>
                </td>
                <td class="actions-cell">
                  <button class="view-details-btn" on:click={() => viewDetails(device.device_id)}>
                    👁️ View Details
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .device-management {
    padding: 2rem;
    background: #f8fafc;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Header Styles */
  .page-header {
    margin-bottom: 2rem;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .welcome-text {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .user-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .notification-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background 0.2s;
  }

  .notification-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: white;
    padding: 0.5rem 1rem;
    border-radius: 25px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .user-avatar {
    font-size: 1.2rem;
  }

  .user-name {
    font-weight: 500;
    color: #374151;
  }

  .page-title-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .page-title-section h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .export-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .export-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  /* Filters Section */
  .filters-section {
    display: flex;
    gap: 2rem;
    align-items: end;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    flex-wrap: wrap;
  }

  .search-filter, .dropdown-filter {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #6b7280;
  }

  .search-input {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    color: #9ca3af;
  }

  .search-input input {
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    width: 250px;
  }

  .search-input input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  select {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
    min-width: 150px;
  }

  select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .more-filters-btn {
    background: none;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #6b7280;
    transition: all 0.2s;
  }

  .more-filters-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  /* Stats Section */
  .stats-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 1.5rem;
    padding: 0.75rem;
    border-radius: 10px;
    background: #f3f4f6;
  }

  .stat-card.online .stat-icon {
    background: #d1fae5;
  }

  .stat-card.offline .stat-icon {
    background: #fee2e2;
  }

  .stat-card.warning .stat-icon {
    background: #fef3c7;
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
  }

  /* Loading and Error States */
  .loading-section, .error-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .retry-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  /* Table Section */
  .table-section {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .table-container {
    overflow-x: auto;
  }

  .devices-table {
    width: 100%;
    border-collapse: collapse;
  }

  .devices-table th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
  }

  .devices-table td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .device-row:hover {
    background: #f9fafb;
  }

  .checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .device-info {
    min-width: 200px;
  }

  .device-id {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .device-name {
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  .device-installed {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .device-farm {
    font-size: 0.8rem;
    color: #059669;
    font-weight: 500;
  }

  .gateway-info, .user-info {
    min-width: 150px;
  }

  .gateway-name, .user-name {
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .gateway-id, .user-id {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    width: fit-content;
    margin-bottom: 0.5rem;
  }

  .status-badge.online {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.offline {
    background: #fee2e2;
    color: #991b1b;
  }

  .error-badge {
    background: #fef3c7;
    color: #92400e;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
    width: fit-content;
  }

  .last-active {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .subscription-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .plan-name {
    font-weight: 500;
    color: #1f2937;
    font-size: 0.9rem;
  }

  .plan-type {
    font-size: 0.8rem;
    color: #6b7280;
    text-transform: capitalize;
  }

  .expires-date {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .expired-badge {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
    width: fit-content;
  }

  .active-badge {
    background: #d1fae5;
    color: #065f46;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
    width: fit-content;
  }

  .no-plan-badge {
    background: #f3f4f6;
    color: #6b7280;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
    width: fit-content;
  }

  .view-details-btn {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .view-details-btn:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .stats-section {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .filters-section {
      flex-wrap: wrap;
      gap: 1rem;
    }
  }

  @media (max-width: 768px) {
    .device-management {
      padding: 1rem;
    }
    
    .stats-section {
      grid-template-columns: 1fr;
    }
    
    .page-title-section {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }
    
    .header-top {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .filters-section {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input input {
      width: 100%;
    }

    select {
      width: 100%;
    }
  }
</style>