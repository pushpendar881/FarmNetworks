
<script>
  import Header from '$lib/components/Header.svelte';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Get seller ID from URL parameters
  $: sellerId = $page.params.sellerId;

  // State variables
  let seller = null;
  let gateways = [];
  let devices = [];
  let subscriptions = [];
  let sellerEarnings = [];
  let loading = true;
  let error = null;

  // Stats
  $: totalGateways = gateways.length;
  $: activeGateways = gateways.filter(g => g.status === 'active').length;
  $: totalDevices = devices.length;
  $: onlineDevices = devices.filter(d => d.motor_status === 1).length;
  $: totalSubscriptions = subscriptions.length;
  $: activeSubscriptions = subscriptions.filter(s => new Date(s.valid_until) > new Date()).length;
  $: totalEarnings = sellerEarnings.reduce((sum, earning) => sum + (parseFloat(earning.total_amount) || 0), 0);
  $: totalCommissions = sellerEarnings.reduce((sum, earning) => sum + (parseFloat(earning.total_commission) || 0), 0);

  onMount(async () => {
    if (sellerId) {
      await fetchSellerDetails();
    } else {
      error = 'No seller ID provided';
      loading = false;
    }
  });

  async function fetchSellerDetails() {
    try {
      loading = true;
      error = null;

      // Fetch seller profile with user details
      const { data: sellerData, error: sellerError } = await supabase
        .from('seller_profiles')
        .select(`
          *,
          user_profiles!inner(*)
        `)
        .eq('id', sellerId)
        .single();

      if (sellerError) throw sellerError;
      seller = sellerData;

      // Fetch seller's gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('gateways')
        .select('*')
        .eq('seller_id', sellerId);

      if (gatewaysError) throw gatewaysError;
      gateways = gatewaysData || [];

      // Get gateway IDs for device filtering
      const gatewayIds = gateways.map(g => g.id);

      // Fetch devices for this seller's gateways
      if (gatewayIds.length > 0) {
        const { data: devicesData, error: devicesError } = await supabase
          .from('devices')
          .select('*')
          .in('gateway_id', gatewayIds);

        if (devicesError) throw devicesError;
        devices = devicesData || [];

        // Get device IDs for subscription filtering
        const deviceIds = devices.map(d => d.device_id);

        // Fetch subscriptions for this seller's devices
        if (deviceIds.length > 0) {
          const { data: subscriptionsData, error: subscriptionsError } = await supabase
            .from('subscriptions')
            .select('*')
            .in('device_id', deviceIds)
            .order('created_at', { ascending: false });

          if (subscriptionsError) throw subscriptionsError;
          subscriptions = subscriptionsData || [];
        }
      }

      // Fetch seller earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('seller_earnings')
        .select('*')
        .eq('seller_id', sellerId)
        .order('month_year', { ascending: false });

      if (earningsError) throw earningsError;
      sellerEarnings = earningsData || [];

    } catch (err) {
      console.error('Error fetching seller details:', err);
      error = 'Failed to load seller details';
    } finally {
      loading = false;
    }
  }

  async function updateSellerStatus(newStatus) {
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({
          approval_status: newStatus,
          is_approved: newStatus === 'approved',
          approved_at: newStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', sellerId);

      if (error) throw error;

      // Refresh seller data
      await fetchSellerDetails();
      
    } catch (err) {
      console.error('Error updating seller status:', err);
      alert('Failed to update seller status');
    }
  }

  function formatCurrency(amount) {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function goBack() {
    goto('/admin/adminportal/sellers');
  }
</script>

<svelte:head>
  <title>Seller Details - {seller?.business_name || 'Loading...'}</title>
</svelte:head>

<Header title="Seller Details" />

{#if loading}
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <p>Loading seller details...</p>
  </div>
{:else if error}
  <div class="error-container">
    <div class="error-message">
      <h2>Error</h2>
      <p>{error}</p>
      <button class="back-btn" on:click={goBack}>← Back to Sellers</button>
    </div>
  </div>
{:else if seller}
  <div class="seller-details-container">
    <!-- Header with back button -->
    <div class="page-header">
      <button class="back-btn" on:click={goBack}>← Back to Sellers</button>
      <h1>{seller.business_name}</h1>
    </div>

    <!-- Seller Basic Info Card -->
    <div class="info-card">
      <div class="card-header">
        <h2>Business Information</h2>
        <div class="status-badge" class:approved={seller.approval_status === 'approved'} 
             class:pending={seller.approval_status === 'pending'} 
             class:blocked={seller.approval_status === 'blocked'}>
          {seller.approval_status === 'blocked' ? '🚫 Blocked' : 
           (seller.approval_status === 'approved' ? '✅ Approved' : '⏳ Pending')}
        </div>
      </div>
      
      <div class="card-content">
        <div class="info-grid">
          <div class="info-item">
            <label>Business Name:</label>
            <span>{seller.business_name}</span>
          </div>
          <div class="info-item">
            <label>Business Type:</label>
            <span>{seller.business_type || 'Not specified'}</span>
          </div>
          <div class="info-item">
            <label>GSTIN:</label>
            <span class="gstin">{seller.gstin || 'Not provided'}</span>
          </div>
          <!-- <div class="info-item">
            <label>Total Sales:</label>
            <span class="amount">{formatCurrency(seller.total_sales)}</span>
          </div> -->
          <div class="info-item">
            <label>Address:</label>
            <span>{seller.address || 'Not provided'}</span>
          </div>
          <div class="info-item">
            <label>Location:</label>
            <span>{seller.city || 'N/A'}, {seller.state || 'N/A'} - {seller.pincode || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Joined:</label>
            <span>{formatDate(seller.created_at)}</span>
          </div>
          {#if seller.approved_at}
            <div class="info-item">
              <label>Approved:</label>
              <span>{formatDate(seller.approved_at)}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Action buttons -->
      <div class="card-actions">
        {#if seller.approval_status === 'pending'}
          <button class="approve-btn" on:click={() => updateSellerStatus('approved')}>
            ✅ Approve Seller
          </button>
          <button class="block-btn" on:click={() => updateSellerStatus('blocked')}>
            🚫 Block Seller
          </button>
        {:else if seller.approval_status === 'blocked'}
          <button class="approve-btn" on:click={() => updateSellerStatus('approved')}>
            🔓 Unblock Seller
          </button>
        {:else if seller.approval_status === 'approved'}
          <button class="block-btn" on:click={() => updateSellerStatus('blocked')}>
            🚫 Block Seller
          </button>
        {/if}
      </div>
    </div>

    <!-- Contact Information -->
    <div class="info-card">
      <div class="card-header">
        <h2>Contact Information</h2>
      </div>
      <div class="card-content">
        <div class="info-grid">
          <div class="info-item">
            <label>Contact Person:</label>
            <span>{seller.user_profiles?.full_name || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Email:</label>
            <span class="email">{seller.user_profiles?.email || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Phone:</label>
            <span>{seller.user_profiles?.phone || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Username:</label>
            <span>{seller.user_profiles?.username || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Account Status:</label>
            <span class="status" class:active={seller.user_profiles?.is_active}>
              {seller.user_profiles?.is_active ? '🟢 Active' : '🔴 Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-content">
          <div class="stat-value">{totalGateways}</div>
          <div class="stat-label">Total Gateways</div>
          <div class="stat-detail">{activeGateways} active</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📱</div>
        <div class="stat-content">
          <div class="stat-value">{totalDevices}</div>
          <div class="stat-label">Total Devices</div>
          <div class="stat-detail">{onlineDevices} online</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💳</div>
        <div class="stat-content">
          <div class="stat-value">{totalSubscriptions}</div>
          <div class="stat-label">Subscriptions</div>
          <div class="stat-detail">{activeSubscriptions} active</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{formatCurrency(totalEarnings)}</div>
          <div class="stat-label">Total Earnings</div>
          <div class="stat-detail">All time</div>
        </div>
      </div>
    </div>

    <!-- Gateways Section -->
    {#if gateways.length > 0}
      <div class="info-card">
        <div class="card-header">
          <h2>Gateways ({gateways.length})</h2>
        </div>
        <div class="table-container">
          <table class="details-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Location</th>
                <th>Devices</th>
                <th>Coverage</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {#each gateways as gateway}
                {@const gatewayDevices = devices.filter(d => d.gateway_id === gateway.id)}
                <tr>
                  <td class="gateway-name">{gateway.name}</td>
                  <td>
                    <span class="status-badge small" class:active={gateway.status === 'active'}>
                      {gateway.status}
                    </span>
                  </td>
                  <td class="location">
                    {#if gateway.latitude && gateway.longitude}
                      {gateway.latitude?.toFixed(6)}, {gateway.longitude?.toFixed(6)}
                    {:else}
                      Not set
                    {/if}
                  </td>
                  <td>{gatewayDevices.length}/{gateway.max_devices}</td>
                  <td>{gateway.coverage_radius || 'N/A'} km</td>
                  <td>{formatDate(gateway.created_at)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Recent Subscriptions -->
    {#if subscriptions.length > 0}
      <div class="info-card">
        <div class="card-header">
          <h2>Recent Subscriptions ({subscriptions.length})</h2>
        </div>
        <div class="table-container">
          <table class="details-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Valid From</th>
                <th>Valid Until</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each subscriptions.slice(0, 10) as subscription}
                {@const isActive = new Date(subscription.valid_until) > new Date()}
                <tr>
                  <td class="device-id">{subscription.device_id}</td>
                  <td>{subscription.plan_name}</td>
                  <td class="amount">{formatCurrency(subscription.amount)}</td>
                  <td>{formatDate(subscription.valid_from)}</td>
                  <td>{formatDate(subscription.valid_until)}</td>
                  <td>
                    <span class="status-badge small" class:active={isActive} class:expired={!isActive}>
                      {isActive ? 'Active' : 'Expired'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Earnings History -->
    {#if sellerEarnings.length > 0}
      <div class="info-card">
        <div class="card-header">
          <h2>Earnings History</h2>
        </div>
        <div class="table-container">
          <table class="details-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Total Amount</th>
                <th>Commission</th>
                <th>Transactions</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {#each sellerEarnings as earning}
                <tr>
                  <td class="month">{earning.month_year}</td>
                  <td class="amount">{formatCurrency(earning.total_amount)}</td>
                  <td class="commission">{formatCurrency(earning.total_commission)}</td>
                  <td>{earning.transaction_count}</td>
                  <td>
                    <span class="status-badge small" 
                          class:completed={earning.payment_status === 'completed'}
                          class:pending={earning.payment_status === 'pending'}>
                      {earning.payment_status}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .seller-details-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    gap: 24px;
    display: flex;
    flex-direction: column;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .page-header h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: #1f2937;
  }

  .back-btn {
    background: #f3f4f6;
    color: #374151;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: #e5e7eb;
    transform: translateY(-1px);
  }

  .info-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .card-header {
    background: #f8fafc;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .card-content {
    padding: 24px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-item label {
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-item span {
    font-size: 16px;
    color: #1f2937;
    font-weight: 500;
  }

  .gstin {
    font-family: 'Monaco', 'Menlo', monospace;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px !important;
  }

  .amount {
    color: #059669 !important;
    font-weight: 600 !important;
  }

  .email {
    color: #3b82f6 !important;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge.approved {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.blocked {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-badge.small {
    padding: 4px 12px;
    font-size: 12px;
  }

  .status-badge.active {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.expired {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-badge.completed {
    background: #d1fae5;
    color: #065f46;
  }

  .card-actions {
    padding: 20px 24px;
    background: #f8fafc;
    display: flex;
    gap: 12px;
  }

  .approve-btn, .block-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .approve-btn {
    background: #10b981;
    color: white;
  }

  .approve-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .block-btn {
    background: #ef4444;
    color: white;
  }

  .block-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .stat-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: transform 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 32px;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 50%;
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .stat-detail {
    font-size: 12px;
    color: #9ca3af;
  }

  .table-container {
    overflow-x: auto;
  }

  .details-table {
    width: 100%;
    border-collapse: collapse;
  }

  .details-table th {
    background: #f8fafc;
    padding: 16px 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e5e7eb;
  }

  .details-table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
    color: #374151;
  }

  .details-table tr:hover {
    background: #f9fafb;
  }

  .gateway-name {
    font-weight: 600;
    color: #1f2937;
  }

  .device-id {
    font-family: monospace;
    font-size: 12px;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .location {
    font-family: monospace;
    font-size: 12px;
  }

  .month {
    font-weight: 600;
  }

  .commission {
    color: #8b5cf6;
    font-weight: 600;
  }

  .loading-container, .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    flex-direction: column;
    gap: 16px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    text-align: center;
    padding: 40px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .error-message h2 {
    color: #ef4444;
    margin-bottom: 16px;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .seller-details-container {
      padding: 16px;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .page-header h1 {
      font-size: 24px;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .card-actions {
      flex-direction: column;
    }

    .approve-btn, .block-btn {
      width: 100%;
    }
  }
</style>