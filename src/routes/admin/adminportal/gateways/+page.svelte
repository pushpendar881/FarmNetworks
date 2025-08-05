<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabase.js';
  import Header from '$lib/components/Header.svelte';

  // Gateway data from database
  let gateways = [];
  let sellers = [];
  let devices = [];
  let loading = true;
  let error = null;

  // Filter states
  let searchTerm = '';
  let statusFilter = 'all';
  let sellerFilter = 'all';
  let showMoreFilters = false;

  // Calculate stats
  $: totalGateways = gateways.length;
  $: activeGateways = gateways.filter(g => g.status === 'active').length;
  $: inactiveGateways = gateways.filter(g => g.status === 'inactive').length;
  $: maintenanceGateways = gateways.filter(g => g.status === 'maintenance').length;
  $: totalDevices = gateways.reduce((sum, g) => sum + (g.device_count || 0), 0);

  // Filter gateways
  $: filteredGateways = gateways.filter(gateway => {
    const matchesSearch = gateway.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         gateway.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gateway.seller_profiles?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || gateway.status === statusFilter;
    const matchesSeller = sellerFilter === 'all' || gateway.seller_id === sellerFilter;
    
    return matchesSearch && matchesStatus && matchesSeller;
  });

  // Get seller name by ID
  function getSellerName(sellerId) {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? seller.business_name : 'Unknown Seller';
  }

  // Get seller details
  function getSellerDetails(sellerId) {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? {
      business_name: seller.business_name,
      business_type: seller.business_type,
      city: seller.city,
      state: seller.state
    } : null;
  }

  // Get device count for gateway
  function getDeviceCount(gatewayId) {
    return devices.filter(d => d.gateway_id === gatewayId).length;
  }

  // Get status color and icon
  function getStatusInfo(status) {
    switch (status) {
      case 'active':
        return {
          color: 'online',
          icon: '📶',
          text: 'Active',
          bgColor: '#d1fae5',
          textColor: '#065f46'
        };
      case 'inactive':
        return {
          color: 'offline',
          icon: '📵',
          text: 'Inactive',
          bgColor: '#fee2e2',
          textColor: '#991b1b'
        };
      case 'maintenance':
        return {
          color: 'maintenance',
          icon: '🔧',
          text: 'Maintenance',
          bgColor: '#fef3c7',
          textColor: '#92400e'
        };
      default:
        return {
          color: 'unknown',
          icon: '❓',
          text: 'Unknown',
          bgColor: '#f3f4f6',
          textColor: '#6b7280'
        };
    }
  }

  // Fetch all gateways with related data
  async function fetchGateways() {
    try {
      loading = true;
      error = null;

      // Fetch gateways with seller info
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('gateways')
        .select(`
          *,
          seller_profiles!inner(
            business_name,
            business_type,
            city,
            state
          )
        `)
        .order('created_at', { ascending: false });

      if (gatewaysError) throw gatewaysError;
      gateways = gatewaysData || [];

      // Fetch sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from('seller_profiles')
        .select('*');

      if (sellersError) throw sellersError;
      sellers = sellersData || [];

      // Fetch devices for device count
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('id, gateway_id');

      if (devicesError) throw devicesError;
      devices = devicesData || [];

      // Add device count to each gateway
      gateways = gateways.map(gateway => ({
        ...gateway,
        device_count: devices.filter(d => d.gateway_id === gateway.id).length
      }));

    } catch (err) {
      console.error('Error fetching gateways:', err);
      error = 'Failed to load gateways data';
    } finally {
      loading = false;
    }
  }

  // Block/Unblock gateway
  async function toggleGatewayStatus(gatewayId, newStatus) {
    try {
      const { error: updateError } = await supabase
        .from('gateways')
        .update({ status: newStatus })
        .eq('id', gatewayId);

      if (updateError) throw updateError;

      // Refresh data
      await fetchGateways();

    } catch (err) {
      console.error('Error updating gateway status:', err);
      error = 'Failed to update gateway status';
    }
  }

  async function blockGateway(gatewayId) {
    if (confirm('Are you sure you want to block this gateway?')) {
      await toggleGatewayStatus(gatewayId, 'inactive');
    }
  }

  async function unblockGateway(gatewayId) {
    if (confirm('Are you sure you want to unblock this gateway?')) {
      await toggleGatewayStatus(gatewayId, 'active');
    }
  }

  // function handleExport() {
  //   console.log('Exporting gateway data...');
  //   // TODO: Implement CSV export functionality
  // }

  // function viewDetails(gatewayId) {
  //   console.log('Viewing details for:', gatewayId);
  //   // TODO: Navigate to gateway details page
  // }

  function toggleMoreFilters() {
    showMoreFilters = !showMoreFilters;
  }

  onMount(() => {
    fetchGateways();
  });
</script>

<div class="dashboard-content">
  <Header title="Gateways" />

  <!-- Filters Section -->
  <div class="filters-section" in:fade={{ delay: 200 }}>
    <div class="search-filter">
      <span class="filter-label">Search Gateways</span>
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Search by Gateway Name, ID, or Seller"
          bind:value={searchTerm}
        />
      </div>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Status Filter</span>
      <select bind:value={statusFilter}>
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Seller Filter</span>
      <select bind:value={sellerFilter}>
        <option value="all">All Sellers</option>
        {#each sellers as seller}
          <option value={seller.id}>{seller.business_name}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="stats-section" in:fly={{ y: 30, delay: 400 }}>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Total Gateways</div>
        <div class="stat-value">{totalGateways}</div>
      </div>
    </div>

    <div class="stat-card online">
      <div class="stat-content">
        <div class="stat-label">Active</div>
        <div class="stat-value">{activeGateways}</div>
      </div>
    </div>

    <div class="stat-card offline">
      <div class="stat-content">
        <div class="stat-label">Inactive</div>
        <div class="stat-value">{inactiveGateways}</div>
      </div>
    </div>

    <div class="stat-card maintenance">
      <div class="stat-content">
        <div class="stat-label">Maintenance</div>
        <div class="stat-value">{maintenanceGateways}</div>
      </div>
    </div>

    <!-- <div class="stat-card devices">
      <div class="stat-content">
        <div class="stat-label">Total Devices</div>
        <div class="stat-value">{totalDevices}</div>
      </div>
    </div> -->
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-section" in:fade={{ delay: 300 }}>
      <div class="loading-spinner"></div>
      <p>Loading gateways data...</p>
    </div>
  {:else if error}
    <div class="error-section" in:fade={{ delay: 300 }}>
      <p>❌ {error}</p>
      <button class="retry-btn" on:click={fetchGateways}>Retry</button>
    </div>
  {:else}
    <!-- Gateways Table -->
    <div class="table-section" in:fly={{ y: 30, delay: 600 }}>
      <div class="table-container">
        <table class="gateways-table">
          <thead>
            <tr>
              <th>GATEWAY INFO</th>
              <th>SELLER</th>
              <th>STATUS</th>
              <th>DEVICES</th>
              <th>LOCATION</th>
              <th>CREATED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredGateways as gateway, i}
              {@const statusInfo = getStatusInfo(gateway.status)}
              {@const sellerDetails = getSellerDetails(gateway.seller_id)}
              <tr class="gateway-row" in:fly={{ x: 30, delay: 800 + (i * 100) }}>
                <td class="gateway-info">
                  <div class="gateway-details">
                    <div class="gateway-name">{gateway.name}</div>
                    <div class="gateway-id">ID: {gateway.id}</div>
                    <div class="gateway-type">Max Devices: {gateway.max_devices || 100}</div>
                    <div class="gateway-coverage">
                      Coverage: {gateway.coverage_radius ? `${gateway.coverage_radius}m` : 'N/A'}
                    </div>
                  </div>
                </td>
                <td class="seller-info">
                  <div class="seller-details">
                    <div class="seller-name">{sellerDetails?.business_name || 'Unknown'}</div>
                    <div class="seller-type">{sellerDetails?.business_type || 'N/A'}</div>
                    <div class="seller-location">
                      {sellerDetails?.city && sellerDetails?.state ? 
                        `${sellerDetails.city}, ${sellerDetails.state}` : 'Location N/A'}
                    </div>
                  </div>
                </td>
                <td class="status-cell">
                  <div class="status-badge" class:online={gateway.status === 'active'} 
                       class:offline={gateway.status === 'inactive'} 
                       class:maintenance={gateway.status === 'maintenance'}>
                    <span class="status-icon">{statusInfo.icon}</span>
                    <span class="status-text">{statusInfo.text}</span>
                  </div>
                </td>
                <td class="devices-info">
                  <div class="devices-details">
                    <div class="devices-count">{gateway.device_count || 0} / {gateway.max_devices || 100}</div>
                    <div class="devices-percentage">
                      {gateway.max_devices ? Math.round((gateway.device_count || 0) / gateway.max_devices * 100) : 0}% Full
                    </div>
                  </div>
                </td>
                <td class="location-info">
                  {#if gateway.latitude && gateway.longitude}
                    <div class="location-details">
                      <div class="coordinates">
                        {gateway.latitude.toFixed(4)}, {gateway.longitude.toFixed(4)}
                      </div>
                      <div class="location-type">GPS Coordinates</div>
                    </div>
                  {:else}
                    <div class="no-location">No Location Data</div>
                  {/if}
                </td>
                <td class="created-info">
                  {gateway.created_at ? new Date(gateway.created_at).toLocaleDateString() : 'Unknown'}
                </td>
                <td class="actions-cell">
                  {#if gateway.status === 'active'}
                    <button class="block-btn" on:click={() => blockGateway(gateway.id)}>
                      🚫 Inactive   
                    </button>
                  {:else if gateway.status === 'inactive'}
                    <button class="unblock-btn" on:click={() => unblockGateway(gateway.id)}>
                      ✅ Active
                    </button>
                  {:else}
                    <button class="maintenance-btn" disabled>
                      🔧 Maintenance
                    </button>
                  {/if}
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

  .gateways-table {
    width: 100%;
    border-collapse: collapse;
  }

  .gateways-table th {
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

  .gateways-table td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .gateway-row:hover {
    background: #f9fafb;
  }

  .gateway-info {
    min-width: 200px;
  }

  .gateway-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .gateway-id {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .gateway-type {
    font-size: 0.8rem;
    color: #059669;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .gateway-coverage {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .seller-info {
    min-width: 150px;
  }

  .seller-name {
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .seller-type {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .seller-location {
    font-size: 0.8rem;
    color: #059669;
    font-weight: 500;
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
  }

  .status-badge.online {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.offline {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-badge.maintenance {
    background: #fef3c7;
    color: #92400e;
  }

  .devices-info {
    min-width: 120px;
  }

  .devices-count {
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .devices-percentage {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .location-info {
    min-width: 150px;
  }

  .location-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .coordinates {
    font-size: 0.8rem;
    color: #1f2937;
    font-weight: 500;
  }

  .location-type {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .no-location {
    font-size: 0.8rem;
    color: #9ca3af;
    font-style: italic;
  }

  .created-info {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .actions-cell {
    min-width: 120px;
  }

  .block-btn, .unblock-btn, .maintenance-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .block-btn {
    background: #fee2e2;
    color: #991b1b;
  }

  .block-btn:hover {
    background: #fecaca;
  }

  .unblock-btn {
    background: #d1fae5;
    color: #065f46;
  }

  .unblock-btn:hover {
    background: #a7f3d0;
  }

  .maintenance-btn {
    background: #f3f4f6;
    color: #6b7280;
    cursor: not-allowed;
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