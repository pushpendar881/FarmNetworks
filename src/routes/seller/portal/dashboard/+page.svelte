<script>
    import Header from '$lib/components/Header.svelte';
    import StatCard from '$lib/components/StatCard.svelte';
    import MasterCard from '$lib/components/MasterCard.svelte';
    import { 
        masters, 
        stats, 
        earnings,
        loading,
        error,
        initializeDashboard,
        refreshDashboard 
    } from '$lib/stores/dashboard.js';
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/auth.js';
    import { supabase } from '$lib/supabase.js';
    import { goto } from '$app/navigation';
    
    let showAllMasters = false;
    let sellerProfile = null;
    let isLoading = true;
    let errorMessage = null;
    let dashboardError = null;
    
    // Chart variables
    let monthlyChart = null;
    let deviceStatusChart = null;
    let earningsChart = null;
    let monthlyChartCanvas = null;
    let deviceStatusChartCanvas = null;
    let earningsChartCanvas = null;
    
    // Real data for charts
    let monthlyGrowthData = [];
    let monthlyEarningsData = [];
    let devicesByMaster = [];
    let recentAlerts = [];
    
    function toggleAllMasters() {
        showAllMasters = !showAllMasters;
    }
    function navigateToAddMaster() {
    goto('/seller/portal/add-master');
}

    
    $: displayedMasters = showAllMasters ? $masters : $masters.slice(0, 2);

    // Reactive data for device status chart
    $: deviceStatusData = [
        { 
            name: 'Online', 
            value: $stats.onlineDevices || 0, 
            color: '#22c55e' 
        },
        { 
            name: 'Offline', 
            value: ($stats.totalDevices - $stats.onlineDevices) || 0, 
            color: '#ef4444' 
        },
    ];

    onMount(async () => {
        await loadData();
        await loadChartData();
        createCharts();
    });

    async function loadData() {
        isLoading = true;
        errorMessage = null;
        dashboardError = null;

        try {
            // Load seller profile first using the updated auth store
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                errorMessage = 'User not authenticated';
                return;
            }

            // Get user profile from user_profiles table
            const { data: userProfile, error: userError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (userError) {
                errorMessage = 'Failed to load user profile';
                return;
            }

            // Check if user is a seller
            if (userProfile.role !== 'seller') {
                errorMessage = 'Access denied. Seller account required.';
                return;
            }

            // Get seller profile from seller_profiles table
            const { data: sellerProfileData, error: sellerError } = await supabase
                .from('seller_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (sellerError) {
                errorMessage = 'Failed to load seller profile';
                return;
            }

            // Combine user and seller profile data
            sellerProfile = {
                ...userProfile,
                ...sellerProfileData
            };
            
            // Initialize dashboard with seller ID
            const dashboardResult = await initializeDashboard(user.id);
            
            if (!dashboardResult.success) {
                dashboardError = dashboardResult.error || 'Failed to load dashboard data';
            }
        } catch (err) {
            console.error('Error loading data:', err);
            errorMessage = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function loadChartData() {
        if (!sellerProfile) return;
        
        try {
            // Load monthly growth data (devices added per month)
            await loadMonthlyGrowthData();
            
            // Load monthly earnings data
            await loadMonthlyEarningsData();
            
            // Load device distribution by master
            await loadDevicesByMaster();
            
            // Load recent alerts/issues
            await loadRecentAlerts();
            
        } catch (err) {
            console.error('Error loading chart data:', err);
        }
    }

    async function loadMonthlyGrowthData() {
        const currentDate = new Date();
        const monthsData = [];
        
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
            
            // Get devices added in this month for this seller's gateways
            const { data: gateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('seller_id', sellerProfile.id);
                
            if (gateways && gateways.length > 0) {
                const gatewayIds = gateways.map(g => g.id);
                
                const { data: devices } = await supabase
                    .from('devices')
                    .select('id, created_at')
                    .in('gateway_id', gatewayIds)
                    .gte('created_at', monthDate.toISOString())
                    .lt('created_at', nextMonth.toISOString());
                
                monthsData.push({
                    month: monthDate.toLocaleDateString('en', { month: 'short' }),
                    devices: devices ? devices.length : 0,
                    fullDate: monthDate
                });
            } else {
                // No gateways found, add month with 0 devices
                monthsData.push({
                    month: monthDate.toLocaleDateString('en', { month: 'short' }),
                    devices: 0,
                    fullDate: monthDate
                });
            }
        }
        
        monthlyGrowthData = monthsData;
    }

    async function loadMonthlyEarningsData() {
        const currentDate = new Date();
        const earningsData = [];
        
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
            
            // Get seller's gateways first
            const { data: gateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('seller_id', sellerProfile.id);
                
            if (gateways && gateways.length > 0) {
                const gatewayIds = gateways.map(g => g.id);
                
                // Get devices in seller's gateways
                const { data: sellerDevices } = await supabase
                    .from('devices')
                    .select('device_id')
                    .in('gateway_id', gatewayIds);
                    
                if (sellerDevices && sellerDevices.length > 0) {
                    const deviceIds = sellerDevices.map(d => d.device_id);
                    
                    // Get subscriptions for seller's devices
                    const { data: subscriptions } = await supabase
                        .from('subscriptions')
                        .select('amount')
                        .in('device_id', deviceIds)
                        .gte('valid_from', monthDate.toISOString())
                        .lt('valid_from', nextMonth.toISOString());
                    
                    // Calculate earnings (assuming 10% commission rate)
                    const commissionRate = 10;
                    const monthEarnings = subscriptions 
                        ? subscriptions.reduce((sum, sub) => sum + (parseFloat(sub.amount) * commissionRate / 100), 0)
                        : 0;
                    
                    earningsData.push({
                        month: monthDate.toLocaleDateString('en', { month: 'short' }),
                        earnings: Math.round(monthEarnings)
                    });
                } else {
                    earningsData.push({
                        month: monthDate.toLocaleDateString('en', { month: 'short' }),
                        earnings: 0
                    });
                }
            } else {
                earningsData.push({
                    month: monthDate.toLocaleDateString('en', { month: 'short' }),
                    earnings: 0
                });
            }
        }
        
        monthlyEarningsData = earningsData;
    }

    async function loadDevicesByMaster() {
        // Get device count by each gateway/master
        const { data: gateways } = await supabase
            .from('gateways')
            .select('name, status')
            .eq('seller_id', sellerProfile.id);
        
        devicesByMaster = gateways || [];
    }

    async function loadRecentAlerts() {
        // Get devices with errors or offline status
        const { data: gateways } = await supabase
            .from('gateways')
            .select('id, name')
            .eq('seller_id', sellerProfile.id);
            
        if (!gateways || gateways.length === 0) {
            recentAlerts = [];
            return;
        }
        
        const gatewayIds = gateways.map(g => g.id);
        const gatewayMap = Object.fromEntries(gateways.map(g => [g.id, g.name]));
        
        // Get devices with issues
        const { data: problemDevices } = await supabase
            .from('devices')
            .select('device_id, device_name, gateway_id, motor_status, error_status, last_updated,created_at')
            .in('gateway_id', gatewayIds)
            .or('motor_status.eq.0,error_status.neq.0')
            .order('last_updated', { ascending: false })
            .limit(5);
        
        recentAlerts = (problemDevices || []).map((device, index) => ({
            id: index + 1,
            device: device.device_name || device.device_id,
            master: gatewayMap[device.gateway_id] || 'Unknown',
            message: device.motor_status === 0 
                ? 'Device offline' 
                : device.error_status !== 0 
                    ? 'Device error detected' 
                    : 'Status unknown',
            type: device.error_status !== 0 ? 'error' : 'warning',
            time: getTimeAgo(device.last_updated)
        }));
    }

    function getTimeAgo(dateString) {
        if (!dateString) return 'Never';
        
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHours < 1) return 'Less than 1 hour ago';
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    async function handleRefresh() {
        if (sellerProfile) {
            await refreshDashboard(sellerProfile.id);
            await loadChartData();
            updateCharts();
        }
    }

    function createCharts() {
        // Destroy existing charts
        if (monthlyChart) monthlyChart.destroy();
        if (deviceStatusChart) deviceStatusChart.destroy();
        if (earningsChart) earningsChart.destroy();

        // Monthly Growth Chart
        if (monthlyChartCanvas) {
            const ctx = monthlyChartCanvas.getContext('2d');
            monthlyChart = new Chart(ctx, {
                type: 'line', //bar , line , doughnut,radar,
                data: {
                    labels: monthlyGrowthData.map(d => d.month),
                    datasets: [{
                        label: 'New Devices',
                        data: monthlyGrowthData.map(d => d.devices),
                        backgroundColor: '#3b82f6',
                        borderColor: '#2563eb',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Device Status Pie Chart
        if (deviceStatusChartCanvas && deviceStatusData.some(d => d.value > 0)) {
            const ctx = deviceStatusChartCanvas.getContext('2d');
            deviceStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: deviceStatusData.map(d => d.name),
                    datasets: [{
                        data: deviceStatusData.map(d => d.value),
                        backgroundColor: deviceStatusData.map(d => d.color),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Monthly Earnings Chart
        // if (earningsChartCanvas && monthlyEarningsData.length > 0) {
        //     const ctx = earningsChartCanvas.getContext('2d');
        //     earningsChart = new Chart(ctx, {
        //         type: 'line',
        //         data: {
        //             labels: monthlyEarningsData.map(d => d.month),
        //             datasets: [{
        //                 label: 'Monthly Earnings (₹)',
        //                 data: monthlyEarningsData.map(d => d.earnings),
        //                 borderColor: '#10b981',
        //                 backgroundColor: 'rgba(16, 185, 129, 0.1)',
        //                 borderWidth: 3,
        //                 fill: true,
        //                 tension: 0.4
        //             }]
        //         },
        //         options: {
        //             responsive: true,
        //             maintainAspectRatio: false,
        //             plugins: {
        //                 legend: {
        //                     display: true
        //                 }
        //             },
        //             scales: {
        //                 y: {
        //                     beginAtZero: true,
        //                     ticks: {
        //                         callback: function(value) {
        //                             return '₹' + value;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     });
        // }
    }

    function updateCharts() {
        if (monthlyChart) {
            monthlyChart.data.labels = monthlyGrowthData.map(d => d.month);
            monthlyChart.data.datasets[0].data = monthlyGrowthData.map(d => d.devices);
            monthlyChart.update();
        }

        if (deviceStatusChart) {
            deviceStatusChart.data.datasets[0].data = deviceStatusData.map(d => d.value);
            deviceStatusChart.update();
        }

        if (earningsChart) {
            earningsChart.data.labels = monthlyEarningsData.map(d => d.month);
            earningsChart.data.datasets[0].data = monthlyEarningsData.map(d => d.earnings);
            earningsChart.update();
        }
    }

    // Format currency
    function formatCurrency(amount) {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    // Update charts when data changes
    $: if (monthlyChart && deviceStatusChart) {
        updateCharts();
    }
</script>

<svelte:head>
    <title>Seller Dashboard - Device Management System</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</svelte:head>

<Header title="Seller Dashboard" />

<div class="dashboard-content">
    {#if isLoading}
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading dashboard...</p>
        </div>
    {:else if errorMessage}
        <div class="error-container">
            <h3>Error Loading Data</h3>
            <p>{errorMessage}</p>
            <button class="retry-btn" on:click={loadData}>Retry</button>
        </div>
    {:else}
        <!-- Dashboard Controls -->
        <div class="dashboard-controls">
            <div class="last-updated">
                Last updated: {new Date().toLocaleString()}
            </div>
            <button class="refresh-btn" on:click={handleRefresh} disabled={$loading.stats || $loading.masters}>
                {#if $loading.stats || $loading.masters}
                    <span class="spinner-small"></span>
                    Refreshing...
                {:else}
                    🔄 Refresh Data
                {/if}
            </button>

           
        </div>

        {#if dashboardError}
            <div class="dashboard-error">
                <p>⚠️ {dashboardError}</p>
            </div>
        {/if}

        <!-- Stats Grid -->
        <div class="stats-grid">
            <StatCard 
                title="Total Masters" 
                value={$loading.stats ? '...' : $stats.totalMasters} 
                change="All operational" 
                icon="🏢" 
                iconColor="#667eea"
                loading={$loading.stats}
            />
            <StatCard 
                title="Total Devices" 
                value={$loading.stats ? '...' : $stats.totalDevices} 
                change={$loading.stats ? 'Loading...' : `${$stats.totalDevices} devices managed`}
                icon="📱" 
                iconColor="#48bb78"
                loading={$loading.stats}
            />
            <StatCard 
                title="Online Devices" 
                value={$loading.stats ? '...' : $stats.onlineDevices} 
                change={$loading.stats ? 'Loading...' : `${$stats.uptimePercent}% uptime`}
                icon="🟢" 
                iconColor="#38a169"
                loading={$loading.stats}
            />
            <StatCard 
                title="Recharged This Month" 
                value={$loading.stats ? '...' : $stats.rechargedThisMonth} 
                change={$loading.stats ? 'Loading...' : `${$stats.rechargeRate}% recharge rate`}
                icon="💳" 
                iconColor="#ed8936"
                loading={$loading.stats}
            />
        </div>

        <!-- Charts Section -->
        <div class="charts-grid">
            <!-- Monthly Growth Chart -->
            <div class="chart-card">
                <h3 class="chart-title">Monthly Device Growth</h3>
                <div class="chart-container">
                    <canvas bind:this={monthlyChartCanvas} width="400" height="300"></canvas>
                </div>
            </div>

            <!-- Device Status Chart -->
            <div class="chart-card">
                <h3 class="chart-title">Device Status Distribution</h3>
                <div class="chart-container">
                    <canvas bind:this={deviceStatusChartCanvas} width="400" height="300"></canvas>
                </div>
                <div class="chart-legend">
                    {#each deviceStatusData as item}
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: {item.color}"></div>
                            <span class="legend-text">{item.name}: {item.value}</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Earnings Chart (if seller has earnings) -->
        <!-- {#if $earnings.totalEarnings > 0 || $loading.earnings}
            <div class="earnings-section">
                <div class="section-header">
                    <h3 class="section-title">Earnings Overview</h3>
                </div>
                
                <div class="earnings-content">
                    <div class="earnings-grid">
                        <div class="earning-card">
                            <div class="earning-icon">💰</div>
                            <div class="earning-content">
                                <div class="earning-value">
                                    {$loading.earnings ? '...' : formatCurrency($earnings.thisMonth)}
                                </div>
                                <div class="earning-label">This Month</div>
                            </div>
                        </div>
                        
                        <div class="earning-card">
                            <div class="earning-icon">📊</div>
                            <div class="earning-content">
                                <div class="earning-value">
                                    {$loading.earnings ? '...' : $earnings.devicesRecharged}
                                </div>
                                <div class="earning-label">Devices Recharged</div>
                            </div>
                        </div>
                        
                        <div class="earning-card">
                            <div class="earning-icon">💳</div>
                            <div class="earning-content">
                                <div class="earning-value">
                                    {$loading.earnings ? '...' : formatCurrency($earnings.totalRechargeAmount)}
                                </div>
                                <div class="earning-label">Total Recharge Amount</div>
                            </div>
                        </div>
                        
                        <div class="earning-card">
                            <div class="earning-icon">🎯</div>
                            <div class="earning-content">
                                <div class="earning-value">
                                    {$loading.earnings ? '...' : formatCurrency($earnings.totalEarnings)}
                                </div>
                                <div class="earning-label">Total Earnings</div>
                            </div>
                        </div>
                    </div>

                   
                    <div class="chart-card earnings-chart">
                        <h3 class="chart-title">Monthly Earnings Trend</h3>
                        <div class="chart-container">
                            <canvas bind:this={earningsChartCanvas} width="400" height="250"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        {/if} -->

        <!-- Recent Alerts Section -->
        {#if recentAlerts.length > 0}
            <div class="alerts-section">
                <div class="section-header">
                    <h3 class="section-title">Recent Alerts</h3>
                    <!-- <button class="view-all-btn">View All</button> -->
                </div>
                <div class="alerts-grid">
                    {#each recentAlerts as alert}
                        <div class="alert-item {alert.type}">
                            <div class="alert-icon">
                                {#if alert.type === 'error'}
                                    ⚠️
                                {:else}
                                    ⚡
                                {/if}
                            </div>
                            <div class="alert-content">
                                <div class="alert-header">
                                    <span class="alert-device">{alert.device} ({alert.master})</span>
                                    <span class="alert-time">{alert.time}</span>
                                </div>
                                <div class="alert-message">{alert.message}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Masters and Devices Section -->
        <div class="masters-section">
            <div class="section-header">
                <h3 class="section-title">Masters & Connected Devices</h3>
                <div class="section-actions">
                    <button class="add-master-btn" on:click={navigateToAddMaster}>
                        ➕ Add Master
                    </button>
                    {#if $error.masters}
                        <span class="error-badge">Error loading masters</span>
                    {/if}
                </div>
            </div>

            {#if $loading.masters}
                <div class="loading-masters">
                    <div class="spinner"></div>
                    <p>Loading masters and devices...</p>
                </div>
            {:else if $error.masters}
                <div class="masters-error">
                    <p>Failed to load masters: {$error.masters}</p>
                    <button class="retry-btn" on:click={() => loadData()}>Retry</button>
                </div>
            {:else if $masters.length === 0}
                <div class="no-masters">
                    <p>No masters found. Please contact support to set up your gateway devices.</p>
                </div>
            {:else}
                {#each displayedMasters as master}
                    <MasterCard {master} />
                {/each}

                {#if $masters.length > 2}
                    <div class="view-all-container">
                        <button class="export-btn" on:click={toggleAllMasters}>
                            {showAllMasters ? 'Show Less' : `View All ${$stats.totalMasters} Masters`}
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</div>
<style>
    .dashboard-content {
        padding: 30px 40px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow-x: hidden;
    }

    .loading-container, .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
    }

    .dashboard-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        flex-wrap: wrap;
        gap: 15px;
    }

    .last-updated {
        color: #718096;
        font-size: 0.875rem;
        flex-shrink: 0;
    }

    .refresh-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.3s ease;
        white-space: nowrap;
    }

    .refresh-btn:hover:not(:disabled) {
        background: #5a67d8;
    }

    .refresh-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .dashboard-error {
        background: #fed7d7;
        color: #c53030;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        border-left: 4px solid #e53e3e;
        word-wrap: break-word;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
        width: 100%;
    }

    .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
        width: 100%;
    }

    .chart-card {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .chart-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 20px;
    }

    .chart-container {
        position: relative;
        height: 300px;
        width: 100%;
        max-width: 100%;
    }

    .chart-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 15px;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .legend-text {
        font-size: 14px;
        color: #4a5568;
    }

    .earnings-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
        width: 100%;
        box-sizing: border-box;
    }

    .earnings-content {
        display: grid;
        gap: 25px;
    }

    .earnings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .earning-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .earning-icon {
        font-size: 24px;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        flex-shrink: 0;
    }

    .earning-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
        word-break: break-word;
    }

    .earning-label {
        font-size: 12px;
        opacity: 0.9;
        text-transform: uppercase;
    }

    .earnings-chart {
        margin-top: 0;
    }

    .section-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .add-master-btn {
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background 0.3s ease;
        white-space: nowrap;
    }

    .add-master-btn:hover {
        background: #059669;
    }

    .alerts-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
        width: 100%;
        box-sizing: border-box;
    }

    .alerts-grid {
        display: grid;
        gap: 15px;
    }

    .alert-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 15px;
        border-radius: 10px;
        background: #f8faff;
        border-left: 4px solid #667eea;
    }

    .alert-item.error {
        background: #fef5e7;
        border-left-color: #f56565;
    }

    .alert-item.warning {
        background: #fffaf0;
        border-left-color: #ed8936;
    }

    .alert-icon {
        font-size: 20px;
        margin-top: 2px;
        flex-shrink: 0;
    }

    .alert-content {
        flex: 1;
        min-width: 0; /* Allows flex child to shrink below content size */
    }

    .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 5px;
        gap: 10px;
    }

    .alert-device {
        font-weight: 600;
        color: #2d3748;
        word-break: break-word;
        flex: 1;
    }

    .alert-time {
        font-size: 12px;
        color: #718096;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .alert-message {
        font-size: 14px;
        color: #4a5568;
        word-wrap: break-word;
    }

    .masters-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
        width: 100%;
        box-sizing: border-box;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
        gap: 15px;
        flex-wrap: wrap;
    }

    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        flex: 1;
        min-width: 200px;
    }

    .view-all-btn {
        background: none;
        border: none;
        color: #667eea;
        cursor: pointer;
        font-weight: 600;
        text-decoration: underline;
        white-space: nowrap;
    }

    .error-badge {
        background: #fed7d7;
        color: #c53030;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
    }

    .loading-masters, .masters-error, .no-masters {
        text-align: center;
        padding: 40px 20px;
    }

    .view-all-container {
        text-align: center;
        margin-top: 20px;
    }

    .export-btn, .retry-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
        margin-top: 10px;
    }

    .export-btn:hover:not(:disabled), .retry-btn:hover:not(:disabled) {
        background: #5a67d8;
    }

    .export-btn:disabled, .retry-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* Spinner styles */
    .spinner, .spinner-small {
        border: 4px solid #e2e8f0;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
        flex-shrink: 0;
    }
    .spinner {
        width: 40px;
        height: 40px;
    }
    .spinner-small {
        width: 18px;
        height: 18px;
        border-width: 3px;
    }
    @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
    }

    /* Tablet responsiveness */
    @media (max-width: 1024px) {
        .dashboard-content {
            padding: 20px 25px;
        }
        
        .charts-grid {
            grid-template-columns: 1fr;
        }
        
        .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .chart-container {
            height: 250px;
        }
        
        .earnings-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .dashboard-content {
            padding: 15px 20px;
            margin: 0;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
        }
        
        .dashboard-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }
        
        .last-updated {
            text-align: center;
            order: 2;
        }
        
        .refresh-btn {
            order: 1;
            justify-content: center;
        }
        
        .stats-grid {
            grid-template-columns: 1fr;
            gap: 15px;
        }
        
        .charts-grid {
            grid-template-columns: 1fr;
            gap: 20px;
        }
        
        .chart-card {
            padding: 20px 15px;
        }
        
        .chart-container {
            height: 200px;
        }
        
        .chart-legend {
            gap: 15px;
            justify-content: center;
        }
        
        .earnings-section {
            padding: 20px 15px;
        }
        
        .earnings-grid {
            grid-template-columns: 1fr;
            gap: 15px;
        }
        
        .earning-card {
            padding: 15px;
            gap: 12px;
        }
        
        .earning-value {
            font-size: 18px;
        }
        
        .alerts-section {
            padding: 20px 15px;
        }
        
        .alert-item {
            padding: 12px;
            gap: 10px;
        }
        
        .alert-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }
        
        .alert-time {
            font-size: 11px;
        }
        
        .masters-section {
            padding: 20px 15px;
        }
        
        .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }
        
        .section-actions {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        
        .add-master-btn {
            flex: 1;
            justify-content: center;
            min-width: 120px;
        }
    }

    /* Small mobile devices */
    @media (max-width: 480px) {
        .dashboard-content {
            padding: 10px 15px;
        }
        
        .chart-card, .earnings-section, .alerts-section, .masters-section {
            padding: 15px 12px;
            border-radius: 12px;
        }
        
        .chart-title, .section-title {
            font-size: 16px;
        }
        
        .chart-container {
            height: 180px;
        }
        
        .earning-card {
            flex-direction: column;
            text-align: center;
            padding: 15px;
        }
        
        .earning-icon {
            width: 40px;
            height: 40px;
            font-size: 20px;
        }
        
        .earning-value {
            font-size: 16px;
        }
        
        .alert-item {
            padding: 10px;
        }
        
        .alert-icon {
            font-size: 18px;
        }
        
        .section-actions {
            flex-direction: column;
            gap: 10px;
        }
        
        .add-master-btn {
            width: 100%;
        }
        
        .refresh-btn, .export-btn, .retry-btn {
            width: 100%;
            justify-content: center;
        }
    }

    /* Very small screens */
    @media (max-width: 320px) {
        .dashboard-content {
            padding: 8px 12px;
        }
        
        .stats-grid {
            gap: 12px;
        }
        
        .charts-grid {
            gap: 15px;
        }
        
        .chart-container {
            height: 160px;
        }
        
        .chart-legend {
            flex-direction: column;
            gap: 8px;
            align-items: center;
        }
    }

    
    
    .dashboard-content * {
        box-sizing: border-box;
    }
    
    /* Ensure no elements exceed viewport width */
    .dashboard-content,
    .dashboard-content > *,
    .stats-grid,
    .charts-grid,
    .chart-card,
    .earnings-section,
    .alerts-section,
    .masters-section {
        max-width: 100%;
        overflow-x: hidden;
    }
</style>