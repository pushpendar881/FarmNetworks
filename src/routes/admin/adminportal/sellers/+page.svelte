<script>
  import Header from '$lib/components/Header.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { tick } from 'svelte';
  import { supabase } from '$lib/supabase.js';

  // Main state variables
  let sellers = [];
  let gateways = [];
  let devices = [];
  let subscriptions = [];
  let sellerEarnings = [];
  let loading = true;
  let error = null;
  let selectedMonthValue = new Date().toISOString().slice(0, 7);
  let monthOptions = [];
  
  // Filter states
  let searchTerm = '';
  let statusFilter = 'all';
  let approvalFilter = 'all';
let statusFilter2 = 'all'; // Add this new filter for blocked status
  let cityFilter = 'all';
  let stateFilter = 'all';
  let businessTypeFilter = 'all';
  let showMoreFilters = false;
  
  // Chart variables
  let sellerChart = null;
  let earningsChart = null;
  let chartLoading = false;
  let sellerChartContainer;
  let earningsChartContainer;

  let currentCommission = 0;
  let newCommissionRate = 0;
  let isUpdatingCommission = false;
  let commissionError = null;
  let commissionSuccess = false;

  // Calculate stats
  $: totalSellers = sellers.length;
  $: approvedSellers = sellers.filter(s => s.approval_status === 'approved').length;
  $: pendingSellers = sellers.filter(s => s.approval_status === 'pending').length;
  $: blockedSellers = sellers.filter(s => s.approval_status === 'blocked').length;
  $: totalGateways = gateways.length;
  $: activeGateways = gateways.filter(g => g.status === 'active').length;
  $: totalDevices = devices.length;
  $: totalEarnings = sellerEarnings.reduce((sum, earning) => sum + (parseFloat(earning.total_amount) || 0), 0);
  $: totalCommissions = sellerEarnings.reduce((sum, earning) => sum + (parseFloat(earning.total_commission) || 0), 0);
  $: pendingPayments = sellerEarnings.filter(e => e.payment_status === 'pending').length;

  // Get unique cities and states for filters
  $: uniqueCities = [...new Set(sellers.map(s => s.city).filter(Boolean))].sort();
  $: uniqueStates = [...new Set(sellers.map(s => s.state).filter(Boolean))].sort();
  $: uniqueBusinessTypes = [...new Set(sellers.map(s => s.business_type).filter(Boolean))].sort();

  // Filter sellers
  $: filteredSellers = sellers.filter(seller => {
    const matchesSearch = seller.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         seller.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seller.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seller.gstin?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && seller.approval_status === 'approved') ||
                         (statusFilter === 'inactive' && seller.approval_status !== 'approved');
    
    const matchesApproval = approvalFilter === 'all' ||
                       (approvalFilter === 'approved' && seller.approval_status === 'approved') ||
                       (approvalFilter === 'pending' && seller.approval_status === 'pending');

const matchesStatus2 = statusFilter2 === 'all' ||
                      (statusFilter2 === 'blocked' && seller.approval_status === 'blocked') ||
                      (statusFilter2 === 'active' && seller.approval_status !== 'blocked');

const matchesCity = cityFilter === 'all' || seller.city === cityFilter;
    const matchesState = stateFilter === 'all' || seller.state === stateFilter;
    const matchesBusinessType = businessTypeFilter === 'all' || seller.business_type === businessTypeFilter;
    
    return matchesSearch && matchesStatus && matchesApproval && matchesStatus2 && matchesCity && matchesState && matchesBusinessType;
  });

  onMount(async () => {
    await initializeComponent();
   await fetchCurrentCommissionRobust();
  });

  onDestroy(() => {
    destroyCharts();
  });

  async function fetchCurrentCommission() {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('rate')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      currentCommission = parseFloat(data.rate);
      newCommissionRate = currentCommission;
    } else {
      currentCommission = 0;
      newCommissionRate = 0;
    }
  } catch (err) {
    console.error('Error fetching commission:', err);
    commissionError = 'Failed to fetch current commission rate';
    currentCommission = 0;
    newCommissionRate = 0;
  }
}

async function updateCommissionAlternative() {
  // Validation
  if (newCommissionRate === null || newCommissionRate === undefined || newCommissionRate === '') {
    commissionError = 'Please enter a commission rate';
    return;
  }

  const rate = parseFloat(newCommissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    commissionError = 'Commission rate must be between 0% and 100%';
    return;
  }

  if (rate === currentCommission) {
    commissionError = 'New rate is same as current rate';
    return;
  }

  isUpdatingCommission = true;
  commissionError = null;
  commissionSuccess = false;

  try {
    // Get the current active commission entry
    const { data: currentCommissions, error: fetchError } = await supabase
      .from('commissions')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    if (fetchError) throw fetchError;

    if (currentCommissions && currentCommissions.length > 0) {
      // Update existing active commission
      const { error: updateError } = await supabase
        .from('commissions')
        .update({ 
          rate: rate,
          updated_at: new Date().toISOString() 
        })
        .eq('id', currentCommissions[0].id);

      if (updateError) throw updateError;

      // Update local state only after successful update
      currentCommission = rate;
      newCommissionRate = rate;
      commissionSuccess = true;

      // Clear success message after 3 seconds
      setTimeout(() => {
        commissionSuccess = false;
      }, 3000);

    } else {
      // No active commission found - show specific error
      commissionError = 'No active commission found. Please contact administrator to set up initial commission rate.';
    }

  } catch (err) {
    console.error('Error updating commission:', err);
    
    // Handle specific error types
    if (err.code === '23505') {
      commissionError = 'Commission update failed due to a conflict. Please refresh and try again.';
    } else if (err.code === '23514') {
      commissionError = 'Invalid commission rate. Must be between 0 and 100.';
    } else {
      commissionError = `Failed to update commission rate: ${err.message || 'Unknown error'}`;
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
  async function blockSeller(sellerId) {
  console.log('Blocking seller:', sellerId);
  try{
    const {data, error} = await supabase
      .from('seller_profiles')
      .update({
        approval_status: 'blocked',
        is_approved: false
      })
      .eq('id', sellerId);
    if(error) throw error;
    console.log('Seller blocked successfully');
    handleRefresh();
  }catch(err){
    console.error('Error blocking seller:', err);
    throw err;
  }
};

async function unblockSeller(sellerId) {
  console.log('Unblocking seller:', sellerId);
  try{
    const {data, error} = await supabase
      .from('seller_profiles')
      .update({
        approval_status: 'approved',
        is_approved: true
      })
      .eq('id', sellerId);
    if(error) throw error;
    console.log('Seller unblocked successfully');
    handleRefresh();
  }catch(err){
    console.error('Error unblocking seller:', err);
    throw err;
  }
};

  async function initializeComponent() {
    try {
      loading = true;
      error = null;
      
      // Generate month options
      monthOptions = generateMonthOptions();
      
      // Fetch all data
      await Promise.all([
        fetchSellers(),
        fetchGateways(),
        fetchDevices(),
        fetchSubscriptions(),
        fetchSellerEarnings()
      ]);
      
      // Initialize charts after data is loaded
      await tick();
      setTimeout(() => {
        renderCharts();
      }, 200);
      
    } catch (err) {
      console.error('Error initializing component:', err);
      error = 'Failed to initialize dashboard';
    } finally {
      loading = false;
    }
  }

  function generateMonthOptions() {
    const options = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-IN', { 
        month: 'long', 
        year: 'numeric' 
      });
      options.push({ value, label });
    }
    return options;
  }

  async function fetchSellers() {
    try {
      const { data: sellersData, error: sellersError } = await supabase
        .from('seller_profiles')
        .select(`
          *,
          user_profiles!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (sellersError) throw sellersError;
      sellers = sellersData || [];
    } catch (err) {
      console.error('Error fetching sellers:', err);
      throw err;
    }
  }

  async function fetchGateways() {
    try {
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('gateways')
        .select('*')
        .order('created_at', { ascending: false });

      if (gatewaysError) throw gatewaysError;
      gateways = gatewaysData || [];
    } catch (err) {
      console.error('Error fetching gateways:', err);
      throw err;
    }
  }

  async function fetchDevices() {
    try {
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (devicesError) throw devicesError;
      devices = devicesData || [];
    } catch (err) {
      console.error('Error fetching devices:', err);
      throw err;
    }
  }

  async function fetchSubscriptions() {
    try {
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;
      subscriptions = subscriptionsData || [];
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      throw err;
    }
  }

  async function fetchSellerEarnings() {
    try {
      const { data: earningsData, error: earningsError } = await supabase
        .from('seller_earnings')
        .select('*')
        .order('created_at', { ascending: false });

      if (earningsError) throw earningsError;
      sellerEarnings = earningsData || [];
    } catch (err) {
      console.error('Error fetching seller earnings:', err);
      throw err;
    }
  }

  // Get seller's gateways
  function getSellerGateways(sellerId) {
    return gateways.filter(g => g.seller_id === sellerId);
  }

  // Get seller's devices through gateways
  function getSellerDevices(sellerId) {
    const sellerGatewayIds = getSellerGateways(sellerId).map(g => g.id);
    return devices.filter(d => sellerGatewayIds.includes(d.gateway_id));
  }

  // Get seller's earnings
  function getSellerEarnings(sellerId) {
    return sellerEarnings.filter(e => e.seller_id === sellerId);
  }

  // Get seller's total earnings
  function getSellerTotalEarnings(sellerId) {
    const earnings = getSellerEarnings(sellerId);
    return earnings.reduce((sum, earning) => sum + (parseFloat(earning.total_amount) || 0), 0);
  }

  // Get seller's total commission
  function getSellerTotalCommission(sellerId) {
    const earnings = getSellerEarnings(sellerId);
    return earnings.reduce((sum, earning) => sum + (parseFloat(earning.total_commission) || 0), 0);
  }

  function renderCharts() {
    if (!window.ApexCharts) {
      console.error('ApexCharts not loaded');
      return;
    }

    renderSellerChart();
    renderEarningsChart();
  }

  function renderSellerChart() {
    const chartElement = sellerChartContainer;
    if (!chartElement) return;

    // Destroy existing chart
    if (sellerChart) {
      sellerChart.destroy();
      sellerChart = null;
    }

    // Prepare data for seller approval status chart
    const chartData = [
      { name: 'Approved', value: approvedSellers, color: '#10B981' },
      { name: 'Pending', value: pendingSellers, color: '#F59E0B' }
    ];

    const chartOptions = {
      series: chartData.map(d => d.value),
      labels: chartData.map(d => d.name),
      colors: chartData.map(d => d.color),
      chart: {
        type: 'donut',
        height: 300,
        fontFamily: 'Inter, sans-serif'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Sellers',
                fontSize: '16px',
                fontWeight: 600,
                color: '#374151'
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val, opts) {
          return opts.w.globals.seriesTotals[opts.seriesIndex];
        }
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif'
      }
    };

    try {
      sellerChart = new ApexCharts(chartElement, chartOptions);
      sellerChart.render();
    } catch (error) {
      console.error('Error rendering seller chart:', error);
    }
  }

  function renderEarningsChart() {
    const chartElement = earningsChartContainer;
    if (!chartElement) return;

    // Destroy existing chart
    if (earningsChart) {
      earningsChart.destroy();
      earningsChart = null;
    }

    // Prepare monthly earnings data
    const monthlyData = {};
    sellerEarnings.forEach(earning => {
      const month = earning.month_year;
      if (!monthlyData[month]) {
        monthlyData[month] = { earnings: 0, commissions: 0 };
      }
      monthlyData[month].earnings += parseFloat(earning.total_amount) || 0;
      monthlyData[month].commissions += parseFloat(earning.total_commission) || 0;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const earningsData = sortedMonths.map(month => monthlyData[month].earnings);
    const commissionsData = sortedMonths.map(month => monthlyData[month].commissions);

    const chartOptions = {
      series: [
        {
          name: 'Total Earnings',
          data: earningsData
        },
        {
          name: 'Commissions',
          data: commissionsData
        }
      ],
      colors: ['#3B82F6', '#10B981'],
      chart: {
        type: 'bar',
        height: 300,
        fontFamily: 'Inter, sans-serif'
      },
      xaxis: {
        categories: sortedMonths,
        labels: {
          style: {
            fontFamily: 'Inter, sans-serif'
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        show: true,
        position: 'top'
      },
      tooltip: {
        y: {
          formatter: function(value) {
            return formatCurrency(value);
          }
        }
      }
    };

    try {
      earningsChart = new ApexCharts(chartElement, chartOptions);
      earningsChart.render();
    } catch (error) {
      console.error('Error rendering earnings chart:', error);
    }
  }

  function destroyCharts() {
    if (sellerChart) {
      sellerChart.destroy();
      sellerChart = null;
    }
    if (earningsChart) {
      earningsChart.destroy();
      earningsChart = null;
    }
  }

  function handleExport() {
    console.log('Exporting seller data...');
    // TODO: Implement CSV export functionality
  }

  function viewDetails(sellerId) {
    console.log('Viewing details for:', sellerId);
    // TODO: Navigate to seller details page
  }

  async function approveSeller(sellerId) {
    console.log('Approving seller:', sellerId);
    try{
      const {data, error} = await supabase.from('seller_profiles').update({
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      }).eq('id', sellerId);
      if(error) throw error;
      console.log('Seller approved successfully');
      handleRefresh();
    }catch(err){
      console.error('Error approving seller:', err);
      throw err;
    }
  }

  function toggleMoreFilters() {
    showMoreFilters = !showMoreFilters;
  }

  function handleRefresh() {
    initializeComponent();
  }

  // Format currency helper
  function formatCurrency(amount) {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  // Reactive statement to re-render charts when data changes
  $: if (sellers.length > 0 && sellerChartContainer && !loading) {
    setTimeout(() => {
      renderSellerChart();
    }, 100);
  }

  $: if (sellerEarnings.length > 0 && earningsChartContainer && !loading) {
    setTimeout(() => {
      renderEarningsChart();
    }, 100);
  }
</script>

<svelte:head>
  <title>Seller Management - Admin Dashboard</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/apexcharts/3.45.1/apexcharts.min.js"></script>
</svelte:head>

<Header title="Seller Management" />

<div class="bg-white rounded-lg shadow p-6 mb-8">
  <!-- <h3 class="text-lg font-semibold text-gray-900 mb-4">Commission Management</h3> -->
  
  

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
</div> 



{#if error}
  <div class="error-banner">
    <div class="error-content">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
      <button class="error-close" on:click={() => error = null}>×</button>
    </div>
  </div>
{/if}

<div class="dashboard-content">
  <!-- Filters Section -->

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> 
    <!-- Current Commission Display   -->
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

   <!-- Update Commission Form  -->
   <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
     <h4 class="text-sm font-medium text-gray-700 mb-4">Update Commission Rate</h4>
     
      Success Message 
     {#if commissionSuccess}
       <div class="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-4 text-sm">
         ✅ Commission rate updated successfully!
       </div>
     {/if}

      Error Message 
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
         on:click={updateCommissionAlternative}
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
 
  <div class="filters-section">
    <div class="search-filter">
      <span class="filter-label">Search Sellers</span>
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Search by Business Name, City, State, or GSTIN"
          bind:value={searchTerm}
        />
      </div>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Status</span>
      <select bind:value={statusFilter}>
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Approval</span>
      <select bind:value={approvalFilter}>
        <option value="all">All Approvals</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">City</span>
      <select bind:value={cityFilter}>
        <option value="all">All Cities</option>
        {#each uniqueCities as city}
          <option value={city}>{city}</option>
        {/each}
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">State</span>
      <select bind:value={stateFilter}>
        <option value="all">All States</option>
        {#each uniqueStates as state}
          <option value={state}>{state}</option>
        {/each}
      </select>
    </div>

    <div class="dropdown-filter">
      <span class="filter-label">Status</span>
      <select bind:value={statusFilter2}>
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>

    <!-- <div class="dropdown-filter">
      <!-- <span class="filter-label">Business Type</span> 
      <select bind:value={businessTypeFilter}>
        <option value="all">All Types</option>
        {#each uniqueBusinessTypes as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div> -->

    <button class="refresh-btn" on:click={handleRefresh} disabled={loading} title="Refresh data">
      🔄
    </button>

    <button class="export-btn" on:click={handleExport}>
      Export Data
    </button>
  </div>

  <!-- Stats Cards -->
  <div class="stats-section">
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Total Sellers</div>
        <div class="stat-value">{totalSellers}</div>
        <div class="stat-detail">Registered sellers</div>
      </div>
    </div>

    <div class="stat-card approved">
      <div class="stat-content">
        <div class="stat-label">Approved Sellers</div>
        <div class="stat-value">{approvedSellers}</div>
        <div class="stat-detail">{totalSellers > 0 ? ((approvedSellers / totalSellers) * 100).toFixed(1) : 0}% of total</div>
      </div>
    </div>

    <div class="stat-card warning">
      <div class="stat-content">
        <div class="stat-label">Pending Approval</div>
        <div class="stat-value">{pendingSellers}</div>
        <div class="stat-detail">Awaiting approval</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Total Gateways</div>
        <div class="stat-value">{totalGateways}</div>
        <div class="stat-detail">{activeGateways} active</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Total Devices</div>
        <div class="stat-value">{totalDevices}</div>
        <div class="stat-detail">Across all sellers</div>
      </div>
    </div>

    <div class="stat-card earnings">
      <div class="stat-content">
        <div class="stat-label">Total Earnings</div>
        <div class="stat-value">{formatCurrency(totalEarnings)}</div>
        <div class="stat-detail">All time</div>
      </div>
    </div>

    <div class="stat-card commission">
      <div class="stat-content">
        <div class="stat-label">Total Commissions</div>
        <div class="stat-value">{formatCurrency(totalCommissions)}</div>
        <div class="stat-detail">All time</div>
      </div>
    </div>

    <div class="stat-card pending">
      <div class="stat-content">
        <div class="stat-label">Pending Payments</div>
        <div class="stat-value">{pendingPayments}</div>
        <div class="stat-detail">Need processing</div>
      </div>
    </div>

    <div class="stat-card blocked">
      <div class="stat-content">
        <div class="stat-label">Blocked Sellers</div>
        <div class="stat-value">{blockedSellers}</div>
        <div class="stat-detail">Need attention</div>
      </div>
    </div>
  </div>

  

  <!-- Charts Section -->
  <div class="charts-section">
    <div class="chart-container">
      <h3>Seller Approval Status</h3>
      <div id="seller-chart" bind:this={sellerChartContainer}></div>
    </div>
    
    <div class="chart-container">
      <h3>Monthly Earnings & Commissions</h3>
      <div id="earnings-chart" bind:this={earningsChartContainer}></div>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-section">
      <div class="loading-spinner"></div>
      <p>Loading seller data...</p>
    </div>
  {:else}
    <!-- Sellers Table -->
    <div class="table-section">
      <div class="table-header">
        <h3>All Sellers ({filteredSellers.length} of {totalSellers})</h3>
      </div>
      
      <div class="table-container">
        <table class="sellers-table">
          <thead>
            <tr>
              <th>BUSINESS INFO</th>
              <th>CONTACT</th>
              <th>LOCATION</th>
              <th>GATEWAYS</th>
              <th>DEVICES</th>
              <th>EARNINGS</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredSellers as seller, i}
              {@const sellerGateways = getSellerGateways(seller.id)}
              {@const sellerDevices = getSellerDevices(seller.id)}
              {@const totalEarnings = getSellerTotalEarnings(seller.id)}
              {@const totalCommission = getSellerTotalCommission(seller.id)}
              <tr class="seller-row">
                <td class="business-info">
                  <div class="business-details">
                    <div class="business-name">{seller.business_name}</div>
                    <div class="business-type">{seller.business_type || 'Not specified'}</div>
                    <div class="gstin">GSTIN: {seller.gstin || 'Not provided'}</div>
                    <div class="joined-date">
                      Joined: {new Date(seller.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td class="contact-info">
                  <div class="contact-details">
                    <div class="seller-name">{seller.user_profiles?.full_name || 'N/A'}</div>
                    <div class="seller-email">{seller.user_profiles?.email || 'N/A'}</div>
                    <div class="seller-phone">{seller.user_profiles?.phone || 'N/A'}</div>
                  </div>
                </td>
                <td class="location-info">
                  <div class="location-details">
                    <div class="address">{seller.address || 'Not provided'}</div>
                    <div class="city-state">{seller.city || 'N/A'}, {seller.state || 'N/A'}</div>
                    <div class="pincode">{seller.pincode || 'N/A'}</div>
                  </div>
                </td>
                <td class="gateways-info">
                  <div class="gateways-details">
                    <div class="gateway-count">{sellerGateways.length} Gateways</div>
                    <div class="active-gateways">
                      {sellerGateways.filter(g => g.status === 'active').length} Active
                    </div>
                  </div>
                </td>
                <td class="devices-info">
                  <div class="devices-details">
                    <div class="device-count">{sellerDevices.length} Devices</div>
                    <div class="online-devices">
                      {sellerDevices.filter(d => d.motor_status === 1).length} Online
                    </div>
                  </div>
                </td>
                <td class="earnings-info">
                  <div class="earnings-details">
                    <div class="total-earnings">{formatCurrency(totalEarnings)}</div>
                    <div class="total-commission">Commission: {formatCurrency(totalCommission)}</div>
                    <div class="sales-value">Sales: {formatCurrency(seller.total_sales || 0)}</div>
                  </div>
                </td>
                <td class="status-cell">
                  <div class="approval-badge" 
                       class:approved={seller.approval_status === 'approved'} 
                       class:pending={seller.approval_status === 'pending'} 
                       class:blocked={seller.approval_status === 'blocked'}>
                    <span class="status-icon">
                      {seller.approval_status === 'blocked' ? '🚫' : (seller.approval_status === 'approved' ? '✅' : '⏳')}
                    </span>
                    <span class="status-text">
                      {seller.approval_status === 'blocked' ? 'Blocked' : (seller.approval_status === 'approved' ? 'Approved' : 'Pending')}
                    </span>
                  </div>
                  {#if seller.approved_at && seller.approval_status === 'approved'}
                    <div class="approved-date">
                      Approved: {new Date(seller.approved_at).toLocaleDateString()}
                    </div>
                  {/if}
                </td>
                <td class="actions-cell">
                  <div class="action-buttons">
                    {#if seller.approval_status === 'blocked'}
                      <button class="unblock-btn" on:click={() => unblockSeller(seller.id)}>
                        🔓 Unblock
                      </button>
                    {:else if seller.approval_status === 'pending'}
                      <button class="approve-btn" on:click={() => approveSeller(seller.id)}>
                        ✅ Approve
                      </button>
                      <button class="block-btn" on:click={() => blockSeller(seller.id)}>
                        🚫 Block
                      </button>
                    {:else if seller.approval_status === 'approved'}
                      <button class="block-btn" on:click={() => blockSeller(seller.id)}>
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
  .stat-card.blocked {
  border-left: 4px solid #EF4444;
}

.approval-badge.blocked {
  background: #fee2e2;
  color: #991b1b;
}

.block-btn {
  background: #ef4444;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.block-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.unblock-btn {
  background: #10b981;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.unblock-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}
  .dashboard-content {
    padding: 20px 40px;
    max-width: 1600px;
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

  .refresh-btn, .export-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    font-size: 12px;
  }

  .refresh-btn {
    padding: 6px;
    min-width: auto;
  }

  .refresh-btn:hover:not(:disabled),
  .export-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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

  /* .stat-card.approved {
    border-left: 4px solid #dedede;
  } */

  /* .stat-card.warning {
    border-left: 4px solid #F59E0B;
  }

  .stat-card.earnings {
    border-left: 4px solid #3B82F6;
  }

  .stat-card.commission {
    border-left: 4px solid #8B5CF6;
  }

  .stat-card.pending {
    border-left: 4px solid #EF4444;
  } */

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
    font-size: 26px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .stat-detail {
    font-size: 12px;
    color: #9ca3af;
  }

  .charts-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
    margin-bottom: 25px;
  }

  .chart-container {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .chart-container h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .loading-section {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .table-section {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .table-header {
    padding: 20px 25px;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
  }

  .table-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .table-container {
    overflow-x: auto;
  }

  .sellers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }

  .sellers-table thead {
    background: #f8fafc;
  }

  .sellers-table th {
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e5e7eb;
  }

  .sellers-table td {
    padding: 18px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }

  .seller-row:hover {
    background: #f9fafb;
  }

  .business-info {
    min-width: 200px;
  }

  .business-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .business-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 15px;
  }

  .business-type {
    color: #6b7280;
    font-size: 13px;
  }

  .gstin {
    color: #9ca3af;
    font-size: 12px;
    font-family: monospace;
  }

  .joined-date {
    color: #9ca3af;
    font-size: 12px;
  }

  .contact-info {
    min-width: 180px;
  }

  .contact-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .seller-name {
    font-weight: 500;
    color: #1f2937;
  }

  .seller-email {
    color: #6b7280;
    font-size: 13px;
  }

  .seller-phone {
    color: #6b7280;
    font-size: 13px;
  }

  .location-info {
    min-width: 160px;
  }

  .location-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .address {
    color: #374151;
    font-size: 13px;
    line-height: 1.4;
  }

  .city-state {
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
  }

  .pincode {
    color: #9ca3af;
    font-size: 12px;
  }

  .gateways-info, .devices-info {
    min-width: 100px;
    text-align: center;
  }

  .gateways-details, .devices-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .gateway-count, .device-count {
    font-weight: 600;
    color: #1f2937;
    font-size: 15px;
  }

  .active-gateways, .online-devices {
    color: #10b981;
    font-size: 12px;
    font-weight: 500;
  }

  .earnings-info {
    min-width: 140px;
    text-align: right;
  }

  .earnings-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .total-earnings {
    font-weight: 700;
    color: #1f2937;
    font-size: 15px;
  }

  .total-commission {
    color: #8b5cf6;
    font-size: 12px;
    font-weight: 500;
  }

  .sales-value {
    color: #6b7280;
    font-size: 12px;
  }

  .status-cell {
    min-width: 120px;
    text-align: center;
  }

  .approval-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .approval-badge.approved {
    background: #d1fae5;
    color: #065f46;
  }

  .approval-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-icon {
    font-size: 14px;
  }

  .approved-date {
    color: #9ca3af;
    font-size: 11px;
    margin-top: 4px;
  }

  .actions-cell {
    min-width: 140px;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .view-details-btn, .approve-btn {
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .view-details-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .view-details-btn:hover {
    background: #e5e7eb;
  }

  .approve-btn {
    background: #10b981;
    color: white;
  }

  .approve-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .error-content {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
  }

  .error-icon {
    font-size: 18px;
    color: #dc2626;
  }

  .error-message {
    flex: 1;
    color: #dc2626;
    font-weight: 500;
  }

  .error-close {
    background: none;
    border: none;
    font-size: 20px;
    color: #dc2626;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-close:hover {
    background: rgba(220, 38, 38, 0.1);
    border-radius: 4px;
  }

  /* Responsive Design */
  @media (max-width: 1200px) {
    .charts-section {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard-content {
      padding: 20px;
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

    .sellers-table {
      font-size: 12px;
    }

    .sellers-table th,
    .sellers-table td {
      padding: 10px 8px;
    }

    .action-buttons {
      flex-direction: row;
    }

    .view-details-btn, .approve-btn {
      flex: 1;
    }
  }

  @media (max-width: 480px) {
    .stats-section {
      grid-template-columns: 1fr;
    }

    .table-container {
      font-size: 11px;
    }

    .business-name {
      font-size: 14px;
    }

    .stat-value {
      font-size: 24px;
    }
  }
  </style>