<script>
    import Header from '$lib/components/Header.svelte';
    import { onMount, onDestroy } from 'svelte';
    import { tick } from 'svelte';
    import { 
        earnings, 
        monthlyBreakdown,
        selectedMonth, 
        isLoading, 
        isExporting, 
        error,
        earningsActions 
    } from '$lib/stores/seller/dashboard.js';
    import { sellerStore } from '$lib/stores/sellerStore.js';
    import { supabase } from '$lib/supabase.js';

    // Main state variables
    let sellerId = null;
    let selectedMonthValue = new Date().toISOString().slice(0, 7);
    let monthOptions = [];
    
    // Chart variables
    let subscriptionChart = null;
    let monthlyBreakdownChart = null;
    let earningsChart = null;
    let chartLoading = false;
    let localChartData = [];
    let subscriptionChartContainer;
    let monthlyChartContainer;

    onMount(async () => {
        await initializeComponent();
    });

    onDestroy(() => {
        destroyCharts();
    });

    async function initializeComponent() {
        try {
            // Load seller data
            const seller = await sellerStore.loadCurrentSeller();
            sellerId = seller?.profile?.id;
            
            if (sellerId) {
                // Generate month options first
                monthOptions = generateMonthOptions();
                
                // Set initial selected month in store
                selectedMonth.set(selectedMonthValue);
                
                // Initialize earnings store
                await earningsActions.init(sellerId);
                
                // Load chart data
                await loadChartData();
                
                // Load monthly breakdown data
                await loadMonthlyBreakdown();
            }   
        } catch (err) {
            console.error('Error initializing component:', err);
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

    async function loadChartData() {
        if (!sellerId) return;
        try {
            chartLoading = true;
            console.log('Selected month value:', selectedMonthValue);
            
            const [year, month] = selectedMonthValue.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);
            
            console.log('Start date:', startDate.toISOString().split('T')[0], 'End date:', endDate.toISOString().split('T')[0]);
            
            const { data: subscriptions, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('seller_id', sellerId)
                .eq('payment_status', 'completed')
                .gte('valid_from', startDate.toISOString().split('T')[0])
                .lt('valid_from', endDate.toISOString().split('T')[0]);
            
            if (error) throw error;
            
            console.log('Subscriptions:', subscriptions);
            processSubscriptionData(subscriptions || []);
            console.log('localChartData:', localChartData);
            
            // Wait for chartLoading to be set to false first
            chartLoading = false;
            
            // Then render charts after a small delay
            await tick();
            setTimeout(() => {
                renderCharts();
            }, 100);
            
        } catch (err) {
            console.error('Error loading chart data:', err);
            localChartData = [];
            chartLoading = false;
        }
    }

    async function loadMonthlyBreakdown() {
        if (!sellerId) return;
        try {
            // Load last 6 months of data for breakdown
            const breakdownData = [];
            const now = new Date();
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const monthStr = `${year}-${String(month).padStart(2, '0')}`;
                
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 1);
                
                const { data: monthlyData, error } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('seller_id', sellerId)
                    .eq('payment_status', 'completed')
                    .gte('valid_from', startDate.toISOString().split('T')[0])
                    .lt('valid_from', endDate.toISOString().split('T')[0]);
                
                if (error) throw error;
                
                const monthlyEarnings = monthlyData?.reduce((sum, item) => 
                    sum + (item.amount * 0.1), 0) || 0; // 10% commission
                
                breakdownData.push({
                    month: date.toLocaleDateString('en-IN', { 
                        month: 'short', 
                        year: '2-digit' 
                    }),
                    fullMonth: date.toLocaleDateString('en-IN', { 
                        month: 'long', 
                        year: 'numeric' 
                    }),
                    earnings: monthlyEarnings,
                    transactions: monthlyData?.length || 0,
                    totalAmount: monthlyData?.reduce((sum, item) => sum + item.amount, 0) || 0,
                    successRate: monthlyData?.length > 0 ? 100 : 0 // All completed are 100% success
                });
            }
            
            monthlyBreakdown.set(breakdownData);
            
            // Render monthly breakdown chart
            await tick();
            setTimeout(() => {
                renderMonthlyBreakdownChart();
            }, 200);
            
        } catch (err) {
            console.error('Error loading monthly breakdown:', err);
        }
    }

    function processSubscriptionData(subscriptions) {
        const completedSubs = subscriptions.filter(sub => sub.payment_status === 'completed');
        
        if (completedSubs.length === 0) {
            localChartData = [];
            return;
        }
        
        // Process plan type distribution
        const planTypeStats = {};
        completedSubs.forEach(sub => {
            const planType = sub.plan_type || 'unknown';
            planTypeStats[planType] = (planTypeStats[planType] || 0) + 1;
        });
        
        const total = Object.values(planTypeStats).reduce((sum, count) => sum + count, 0);
        
        localChartData = Object.entries(planTypeStats).map(([planType, count]) => ({
            name: planType.charAt(0).toUpperCase() + planType.slice(1).replace('_', ' '),
            value: count,
            percentage: ((count / total) * 100).toFixed(1)
        }));
    }

    async function renderCharts() {
        // Wait for DOM to update after localChartData changes
        await tick();
        
        // Additional wait to ensure the conditional block has rendered
        if (localChartData.length > 0) {
            // Wait a bit more for the chart container to be available
            setTimeout(() => {
                renderSubscriptionChart();
            }, 50);
        }
    }

    function renderSubscriptionChart() {
        const chartElement = subscriptionChartContainer;
        if (!chartElement) {
            console.warn('Chart element not found, retrying...');
            setTimeout(() => {
                if (subscriptionChartContainer) {
                    renderSubscriptionChart();
                } else {
                    console.error('Chart container still not available after retry');
                }
            }, 200);
            return;
        }
        
        if (!window.ApexCharts) {
            console.error('ApexCharts not loaded');
            return;
        }
        
        // Destroy existing chart
        if (subscriptionChart) {
            subscriptionChart.destroy();
            subscriptionChart = null;
        }
        
        // Only render if we have data
        if (localChartData.length === 0) {
            console.log('No chart data available');
            return;
        }
        
        // BAR CHART
        const chartOptions = {
            series: [{
                name: "Subscriptions",
                data: localChartData.map(d => d.value)
            }],
            colors: ["#1C64F2"],
            chart: {
                type: "bar",
                height: 320,
                fontFamily: "Inter, sans-serif"
            },
            xaxis: {
                categories: localChartData.map(d => d.name),
                labels: {
                    style: {
                        fontFamily: "Inter, sans-serif"
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function(val, opts) {
                    return localChartData[opts.dataPointIndex].percentage + "%";
                },
                style: {
                    fontFamily: "Inter, sans-serif"
                }
            },
            legend: {
                position: "bottom",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px"
            },
            tooltip: {
                y: {
                    formatter: function(value) {
                        return value + " subscriptions";
                    }
                }
            }
        };
        
        try {
            subscriptionChart = new ApexCharts(chartElement, chartOptions);
            subscriptionChart.render();
            console.log('Chart rendered successfully');
        } catch (error) {
            console.error('Error rendering subscription chart:', error);
        }
    }

    function renderMonthlyBreakdownChart() {
        const chartElement = monthlyChartContainer;
        if (!chartElement || !$monthlyBreakdown.length) {
            return;
        }
        
        if (!window.ApexCharts) {
            console.error('ApexCharts not loaded');
            return;
        }
        
        // Destroy existing chart
        if (monthlyBreakdownChart) {
            monthlyBreakdownChart.destroy();
            monthlyBreakdownChart = null;
        }
        
        // LINE CHART for monthly earnings
        const chartOptions = {
            series: [{
                name: "Earnings",
                data: $monthlyBreakdown.map(d => d.earnings)
            }, {
                name: "Transactions",
                data: $monthlyBreakdown.map(d => d.transactions)
            }],
            colors: ["#16BDCA", "#1C64F2"],
            chart: {
                type: "line",
                height: 350,
                fontFamily: "Inter, sans-serif"
            },
            xaxis: {
                categories: $monthlyBreakdown.map(d => d.month),
                labels: {
                    style: {
                        fontFamily: "Inter, sans-serif"
                    }
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Earnings (₹)',
                        style: {
                            fontFamily: "Inter, sans-serif"
                        }
                    },
                    labels: {
                        formatter: function(val) {
                            return '₹' + val.toFixed(0);
                        }
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Transactions',
                        style: {
                            fontFamily: "Inter, sans-serif"
                        }
                    }
                }
            ],
            stroke: {
                curve: "smooth",
                width: 3
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                position: "top",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px"
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: [{
                    formatter: function(value) {
                        return '₹' + value.toFixed(2);
                    }
                }, {
                    formatter: function(value) {
                        return value + " transactions";
                    }
                }]
            }
        };
        
        try {
            monthlyBreakdownChart = new ApexCharts(chartElement, chartOptions);
            monthlyBreakdownChart.render();
            console.log('Monthly breakdown chart rendered successfully');
        } catch (error) {
            console.error('Error rendering monthly breakdown chart:', error);
        }
    }

    function destroyCharts() {
        if (subscriptionChart) {
            subscriptionChart.destroy();
            subscriptionChart = null;
        }
        if (monthlyBreakdownChart) {
            monthlyBreakdownChart.destroy();
            monthlyBreakdownChart = null;
        }
        if (earningsChart) {
            earningsChart.destroy();
            earningsChart = null;
        }
    }

    async function handleMonthChange() {
        console.log('Month changed to:', selectedMonthValue);
        
        // Update the store first
        selectedMonth.set(selectedMonthValue);
        
        // Then update earnings data
        await earningsActions.updateMonth(selectedMonthValue);
        
        // Reload chart data for new month
        await loadChartData();
    }

    async function handleExport() {
        await earningsActions.exportData();
    }

    async function handleRefresh() {
        if (sellerId) {
            await earningsActions.init(sellerId);
            await loadChartData();
            await loadMonthlyBreakdown();
        }
    }

    // Format currency helper
    function formatCurrency(amount) {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    // Reactive statement to sync with store
    $: if (localChartData.length > 0 && subscriptionChartContainer && !chartLoading) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            renderSubscriptionChart();
        }, 100);
    }

    $: if ($monthlyBreakdown.length > 0 && monthlyChartContainer) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            renderMonthlyBreakdownChart();
        }, 100);
    }
</script>

<svelte:head>
    <title>Earnings & Reports - Device Management System</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/apexcharts/3.45.1/apexcharts.min.js"></script>
</svelte:head>

<Header title="Earnings & Reports" />

{#if $error}
    <div class="error-banner">
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-message">{$error}</span>
            <button class="error-close" on:click={earningsActions.clearError}>×</button>
        </div>
    </div>
{/if}

<div class="dashboard-content">
    <!-- Earnings Overview Section -->
    <div class="earnings-section">
        <div class="section-header">
            <h3 class="section-title">Seller Earnings ({$earnings.commissionRate}% Commission)</h3>
            <div class="earnings-filter">
                <select 
                    class="filter-select" 
                    bind:value={selectedMonthValue} 
                    on:change={handleMonthChange}
                    disabled={$isLoading}
                >
                    {#each monthOptions as option}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
                <button 
                    class="export-btn" 
                    on:click={handleExport}
                    disabled={$isExporting || $isLoading}
                >
                    {#if $isExporting}
                        Exporting...
                    {:else}
                        Export Data
                    {/if}
                </button>
                <button 
                    class="refresh-btn" 
                    on:click={handleRefresh}
                    disabled={$isLoading}
                    title="Refresh data"
                >
                    🔄
                </button>
            </div>
        </div>

        {#if $isLoading}
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading earnings data...</p>
            </div>
        {:else}
            <div class="earnings-cards">
                <div class="earnings-card">
                    <div class="earnings-amount">{formatCurrency($earnings.thisMonth)}</div>
                    <div class="earnings-label">This Month Earnings</div>
                </div>
                <div class="earnings-card">
                    <div class="earnings-amount">{$earnings.devicesRecharged}</div>
                    <div class="earnings-label">Devices Recharged</div>
                </div>
                <div class="earnings-card">
                    <div class="earnings-amount">{formatCurrency($earnings.totalRechargeAmount)}</div>
                    <div class="earnings-label">Total Recharge Amount</div>
                </div>
                <div class="earnings-card">
                    <div class="earnings-amount">{$earnings.rechargeRate}%</div>
                    <div class="earnings-label">Success Rate</div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Subscription Distribution Chart -->
    <div class="earnings-section">
        <div class="section-header">
            <div class="chart-header-content">
                <div class="chart-title-container">
                    <h3 class="section-title">Subscription Distribution</h3>
                    <div class="info-icon" title="Shows distribution of subscription plans sold this month">ℹ️</div>
                </div>
            </div>
        </div>

        {#if chartLoading}
            <div class="chart-loading">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading chart data...</p>
                </div>
            </div>
        {:else if localChartData.length === 0}
            <div class="empty-chart">
                <div class="empty-icon">📊</div>
                <h4>No subscription data</h4>
                <p>No completed subscriptions found for {monthOptions.find(m => m.value === selectedMonthValue)?.label || selectedMonthValue}.</p>
            </div>
        {:else}
            <div class="chart-container">
                <div id="subscription-chart" bind:this={subscriptionChartContainer}></div>
            </div>
            
            <div class="chart-summary">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-value">{localChartData.reduce((sum, item) => sum + item.value, 0)}</span>
                        <span class="stat-label">Total Subscriptions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{localChartData.length}</span>
                        <span class="stat-label">Plan Types</span>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Monthly Breakdown Section -->
    <div class="earnings-section">
        <div class="section-header">
            <div class="chart-header-content">
                <div class="chart-title-container">
                    <h3 class="section-title">Monthly Breakdown (Last 6 Months)</h3>
                    <div class="info-icon" title="Shows earnings and transaction trends over the last 6 months">ℹ️</div>
                </div>
            </div>
        </div>
        
        {#if $isLoading}
            <div class="chart-loading">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading monthly breakdown...</p>
                </div>
            </div>
        {:else if $monthlyBreakdown.length === 0}
            <div class="empty-chart">
                <div class="empty-icon">📈</div>
                <h4>No monthly data</h4>
                <p>No earnings data found for the last 6 months.</p>
            </div>
        {:else}
            <div class="chart-container">
                <div id="monthly-breakdown-chart" bind:this={monthlyChartContainer}></div>
            </div>
            
            <div class="monthly-breakdown-table">
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Earnings</th>
                            <th>Transactions</th>
                            <th>Total Amount</th>
                            <th>Success Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each $monthlyBreakdown as breakdown}
                            <tr>
                                <td>{breakdown.fullMonth}</td>
                                <td>{formatCurrency(breakdown.earnings)}</td>
                                <td>{breakdown.transactions}</td>
                                <td>{formatCurrency(breakdown.totalAmount)}</td>
                                <td>
                                    <span class="success-rate">
                                        {breakdown.successRate}%
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<style>
    .dashboard-content {
        padding: 30px 40px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .earnings-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
        border: 1px solid #f1f5f9;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #f1f5f9;
    }

    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        margin: 0;
    }

    .earnings-filter {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .filter-select {
        padding: 10px 15px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s ease;
        font-size: 14px;
    }

    .filter-select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .filter-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .export-btn, .refresh-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        font-size: 14px;
    }

    .refresh-btn {
        padding: 10px;
        min-width: auto;
    }

    .export-btn:hover:not(:disabled),
    .refresh-btn:hover:not(:disabled) {
        background: #5a67d8;
        transform: translateY(-1px);
    }

    .export-btn:disabled,
    .refresh-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    .earnings-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
    }

    .earnings-card {
        background: linear-gradient(135deg, #667eea10, #764ba210);
        padding: 25px 20px;
        border-radius: 12px;
        text-align: center;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
    }

    .earnings-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
    }

    .earnings-amount {
        font-size: 28px;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 8px;
        line-height: 1;
    }

    .earnings-label {
        color: #718096;
        font-size: 14px;
        font-weight: 500;
    }

    .chart-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }

    .chart-title-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .info-icon {
        font-size: 14px;
        color: #718096;
        cursor: help;
        opacity: 0.7;
    }

    .chart-container {
        min-height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px 0;
    }

    #subscription-chart, #monthly-breakdown-chart {
        width: 100%;
        height: 320px;
    }

    #monthly-breakdown-chart {
        height: 350px;
    }

    .chart-summary {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #f1f5f9;
    }

    .summary-stats {
        display: flex;
        justify-content: center;
        gap: 40px;
    }

    .stat-item {
        text-align: center;
    }

    .stat-value {
        display: block;
        font-size: 24px;
        font-weight: 700;
        color: #667eea;
    }

    .stat-label {
        font-size: 14px;
        color: #718096;
        font-weight: 500;
    }

    .chart-loading {
        min-height: 320px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #718096;
    }

    .empty-chart {
        min-height: 320px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #718096;
        text-align: center;
    }

    .empty-chart .empty-icon {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
    }

    .empty-chart h4 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #4a5568;
    }

    .empty-chart p {
        font-size: 14px;
        max-width: 300px;
    }

    .monthly-breakdown-table {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        margin-top: 20px;
    }

    .monthly-breakdown-table table {
        width: 100%;
        border-collapse: collapse;
    }

    .monthly-breakdown-table th,
    .monthly-breakdown-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #f1f5f9;
    }

    .monthly-breakdown-table th {
        background: #f8fafc;
        font-weight: 600;
        color: #4a5568;
        font-size: 14px;
        position: sticky;
        top: 0;
    }

    .monthly-breakdown-table td {
        font-size: 14px;
        color: #2d3748;
    }

    .monthly-breakdown-table tbody tr:hover {
        background: #f8fafc;
    }

    .success-rate {
        background: #c6f6d5;
        color: #22543d;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .loading-spinner {
        text-align: center;
        padding: 40px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f1f5f9;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .error-banner {
            background: #fed7d7;
            border: 1px solid #feb2b2;
            border-radius: 8px;
            margin: 20px 40px;
            padding: 0;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }

        .error-content {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            gap: 12px;
        }

        .error-icon {
            font-size: 18px;
            flex-shrink: 0;
        }

        .error-message {
            color: #742a2a;
            font-size: 14px;
            font-weight: 500;
            flex-grow: 1;
        }

        .error-close {
            background: none;
            border: none;
            color: #742a2a;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
            flex-shrink: 0;
        }

        .error-close:hover {
            background: #feb2b2;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .dashboard-content {
                padding: 20px 20px;
            }

            .earnings-section {
                padding: 20px;
            }

            .section-header {
                flex-direction: column;
                gap: 15px;
                align-items: flex-start;
            }

            .earnings-filter {
                width: 100%;
                justify-content: space-between;
            }

            .earnings-cards {
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .earnings-card {
                padding: 20px 15px;
            }

            .earnings-amount {
                font-size: 24px;
            }

            .summary-stats {
                gap: 20px;
            }

            .stat-value {
                font-size: 20px;
            }

            .error-banner {
                margin: 20px 20px;
            }

            .monthly-breakdown-table {
                font-size: 12px;
            }

            .monthly-breakdown-table th,
            .monthly-breakdown-table td {
                padding: 8px 12px;
            }
        }

        @media (max-width: 480px) {
            .earnings-cards {
                grid-template-columns: 1fr;
            }

            .summary-stats {
                flex-direction: column;
                gap: 15px;
            }

            .earnings-filter {
                flex-direction: column;
                gap: 10px;
            }

            .filter-select,
            .export-btn,
            .refresh-btn {
                width: 100%;
            }
        }

</style>