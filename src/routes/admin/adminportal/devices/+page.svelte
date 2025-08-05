<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabase.js';
  import Header from '$lib/components/Header.svelte';

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
let blockedFilter = 'all';
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
$: blockedDevices = devices.filter(d => d.is_blocked === true).length;

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
  const matchesBlocked = blockedFilter === 'all' || 
                        (blockedFilter === 'blocked' && device.is_blocked === true) ||
                        (blockedFilter === 'active' && device.is_blocked !== true);
  
  return matchesSearch && matchesStatus && matchesGateway && matchesType && matchesBlocked;
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

async function blockDevice(deviceId, block = true) {
  try {
    const { error } = await supabase
      .from('devices')
      .update({ 
        is_blocked: block, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', deviceId);
      
    if (error) throw error;
    
    // Refresh devices data
    await fetchDevices();
    
    alert(`Device ${block ? 'blocked' : 'unblocked'} successfully`);
  } catch (error) {
    console.error('Error updating device:', error);
    alert(`Failed to ${block ? 'block' : 'unblock'} device`);
  }
}

  onMount(() => {
    fetchDevices();
  });
</script>

<div class="dashboard-content">
  <Header title="Devices" />

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
    
    <div class="dropdown-filter">
      <span class="filter-label">Block Status</span>
      <select bind:value={blockedFilter}>
        <option value="all">All Devices</option>
        <option value="active">Active</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>

    <!-- <button class="more-filters-btn" on:click={toggleMoreFilters}>
      🔽 More Filters
    </button> -->
  </div>

  <!-- Stats Cards -->
  <div class="stats-section" in:fly={{ y: 30, delay: 400 }}>
    <div class="stat-card">
      <!-- <div class="stat-icon">📱</div> -->
      <div class="stat-content">
        <div class="stat-label">Total Devices</div>
        <div class="stat-value">{totalDevices}</div>
      </div>
    </div>

    <div class="stat-card online">
      <!-- <div class="stat-icon">📶</div> -->
      <div class="stat-content">
        <div class="stat-label">Online</div>
        <div class="stat-value">{onlineDevices}</div>
      </div>
    </div>

    <div class="stat-card offline">
      <!-- <div class="stat-icon">📵</div> -->
      <div class="stat-content">
        <div class="stat-label">Offline</div>
        <div class="stat-value">{offlineDevices}</div>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-content">
        <div class="stat-label">Expiring Soon</div>
        <div class="stat-value">{expiringDevices}</div>
      </div>
    </div>
    
    <div class="stat-card blocked">
      <div class="stat-content">
        <div class="stat-label">Blocked</div>
        <div class="stat-value">{blockedDevices}</div>
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
              <!-- <th>
                 <input type="checkbox" class="checkbox" /> 
              </th> -->
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
                <!-- <td>
                  <input type="checkbox" class="checkbox" />
                </td> -->
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
                  <div class="device-actions">
                    {#if device.is_blocked}
                      <div class="blocked-indicator">🚫 BLOCKED</div>
                      <button class="unblock-btn" on:click={() => blockDevice(device.id, false)}>
                        ✅ Unblock
                      </button>
                    {:else}
                      <button class="block-btn" on:click={() => blockDevice(device.id, true)}>
                        🚫 Block
                      </button>
                    {/if}
                  </div>
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
  .dashboard-content {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .filters-section {
    display: flex;
    gap: 15px;
    align-items: end;
    margin-bottom: 25px;
    padding: 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    flex-wrap: wrap;
  }

  .search-filter, .dropdown-filter {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-label {
    font-size: 12px;
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
    left: 12px;
    color: #9ca3af;
  }

  .search-input input {
    padding: 8px 10px 8px 30px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    width: 280px;
  }

  .search-input input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  select {
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: white;
    cursor: pointer;
    min-width: 140px;
  }

  select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .stats-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 25px;
  }

  .stat-card {
    background: white;
    padding: 22px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s;
    border: 1px solid #f1f5f9;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .stat-content {
    text-align: center;
  }

  .stat-label {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .dashboard-content {
      padding: 1rem;
    }
    
    .filters-section {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input input {
      width: 100%;
    }

    .stats-section {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
  }
</style>