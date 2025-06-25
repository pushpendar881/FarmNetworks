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
    import { sellerStore, currentSeller } from '$lib/stores/sellerStore.js';
    import { user } from '$lib/stores/auth.js';
    
    let showAllMasters = false;
    let sellerProfile = null;
    let isLoading = true;
    let errorMessage = null;
    let dashboardError = null;
    
    function toggleAllMasters() {
        showAllMasters = !showAllMasters;
    }
    
    $: displayedMasters = showAllMasters ? $masters : $masters.slice(0, 2);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        isLoading = true;
        errorMessage = null;
        dashboardError = null;

        try {
            // Load seller profile first
            const sellerResult = await sellerStore.loadCurrentSeller();
            
            if (sellerResult.success) {
                sellerProfile = sellerResult.profile;
                
                // Initialize dashboard with seller ID
                const dashboardResult = await initializeDashboard(sellerProfile.id);
                
                if (!dashboardResult.success) {
                    dashboardError = dashboardResult.error || 'Failed to load dashboard data';
                }
            } else {
                errorMessage = sellerResult.error;
            }
        } catch (err) {
            console.error('Error loading data:', err);
            errorMessage = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function handleRefresh() {
        if (sellerProfile) {
            await refreshDashboard(sellerProfile.id);
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

    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }
</script>

<svelte:head>
    <title>Seller Dashboard - Device Management System</title>
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

        <!-- Earnings Section (if seller has earnings data) -->
        {#if $earnings.totalEarnings > 0 || $loading.earnings}
            <div class="earnings-section">
                <div class="section-header">
                    <h3 class="section-title">Earnings Overview</h3>
                </div>
                
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
            </div>
        {/if}

        <!-- Masters and Devices Section -->
        <div class="masters-section">
            <div class="section-header">
                <h3 class="section-title">Masters & Connected Devices</h3>
                {#if $error.masters}
                    <span class="error-badge">Error loading masters</span>
                {/if}
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

        <!-- Seller Profile Section (commented out as in original) -->
        <!-- You can uncomment this section if you want to display seller profile -->
    {/if}
</div>

<style>
    .dashboard-content {
        padding: 30px 40px;
    }

    .loading-container, .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        text-align: center;
    }

    .dashboard-controls {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 25px;
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
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
    }

    .earnings-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
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
    }

    .earning-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .earning-label {
        font-size: 12px;
        opacity: 0.9;
        text-transform: uppercase;
    }

    .masters-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
    }

    .error-badge {
        background: #fed7d7;
        color: #c53030;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
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
    }

    .export-btn:hover, .retry-btn:hover {
        background: #5a67d8;
    }

    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    .spinner-small {
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .stats-grid, .earnings-grid {
            grid-template-columns: 1fr;
        }
        
        .dashboard-content {
            padding: 20px;
        }

        .dashboard-controls {
            justify-content: center;
        }

        .earning-card {
            flex-direction: column;
            text-align: center;
        }
    }
</style>