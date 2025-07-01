<script>
    import Header from '$lib/components/Header.svelte';
    import { onMount } from 'svelte';
    import { 
        earnings, 
        formattedEarnings, 
        chartData, 
        selectedMonth, 
        isLoading, 
        isExporting, 
        error,
        earningsActions 
    } from '$lib/stores/seller/dashboard.js';
import { sellerStore } from '$lib/stores/sellerStore.js';


let sellerId = null;

onMount(async () => {
    const seller = await sellerStore.loadCurrentSeller();
    sellerId = seller?.profile?.id;
    if (sellerId) {
        await earningsActions.init(sellerId);
        await loadChartData();
    } else {
        console.warn('Seller ID not found. Please check authentication.');
    }
    monthOptions = generateMonthOptions();
});

    let selectedMonthValue = new Date().toISOString().slice(0, 7);
    let monthOptions = [];
    
    // Chart data and configuration
    let localChartData = [];
    let chartOptions = {};
    let chartLoading = true;
    
    // Generate month options (last 12 months)
    function generateMonthOptions() {
        const options = [];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = date.toISOString().slice(0, 7);
            const label = date.toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });
            options.push({ value, label });
        }
        // console.log(options);
        return options;
    }
    
    // Load chart data from Supabase
    async function loadChartData() {
        try {
            chartLoading = true;
            
            // Fetch subscription data for the chart
            const { data: subscriptions, error } = await supabase
                .from('subscriptions')
                .select('plan_type, payment_status, amount')
                .eq('sold_by', sellerId)
                .gte('created_at', new Date(selectedMonthValue + '-01').toISOString())
                .lt('created_at', new Date(new Date(selectedMonthValue + '-01').getFullYear(), new Date(selectedMonthValue + '-01').getMonth() + 1, 1).toISOString());
            
            if (error) throw error;
            
            // Process data for pie chart
            const planTypeStats = {};
            subscriptions.forEach(sub => {
                if (sub.payment_status === 'completed') {
                    planTypeStats[sub.plan_type] = (planTypeStats[sub.plan_type] || 0) + 1;
                }
            });
            
            const total = Object.values(planTypeStats).reduce((sum, count) => sum + count, 0);
            const chartSeries = Object.values(planTypeStats);
            const chartLabels = Object.keys(planTypeStats).map(key => 
                key.charAt(0).toUpperCase() + key.slice(1)
            );
            
            // Calculate percentages
            const percentages = chartSeries.map(value => ((value / total) * 100).toFixed(1));
            
            localChartData = chartSeries;
            chartOptions = {
                series: chartSeries,
                colors: ["#1C64F2", "#16BDCA", "#9061F9", "#F05252", "#10B981"],
                chart: {
                    height: 320,
                    width: "100%",
                    type: "pie",
                    fontFamily: "Inter, sans-serif"
                },
                stroke: {
                    colors: ["white"],
                    lineCap: "round"
                },
                plotOptions: {
                    pie: {
                        dataLabels: {
                            offset: -25
                        }
                    }
                },
                labels: chartLabels,
                dataLabels: {
                    enabled: true,
                    style: {
                        fontFamily: "Inter, sans-serif"
                    },
                    formatter: function(val, opts) {
                        return percentages[opts.seriesIndex] + "%";
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
            
        } catch (err) {
            console.error('Error loading chart data:', err);
        } finally {
            chartLoading = false;
        }
    }
    
    // Handle month change
    async function handleMonthChange(event) {
        await earningsActions.updateMonth(selectedMonthValue);
        // await loadChartData();
    }
    
    // Handle export
    async function handleExport() {
        await earningsActions.exportData();
    }
    
    // Reactive statement to handle selectedMonth changes
    $: if ($selectedMonth !== selectedMonthValue) {
        selectedMonthValue = $selectedMonth;
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
                    <div class="earnings-amount">₹{$earnings.thisMonth.toLocaleString('en-IN')}</div>
                    <div class="earnings-label">This Month Earnings</div>
                </div>
                <div class="earnings-card">
                    <div class="earnings-amount">{$earnings.devicesRecharged}</div>
                    <div class="earnings-label">Devices Recharged</div>
                </div>
                <div class="earnings-card">
                    <div class="earnings-amount">₹{$earnings.totalRechargeAmount.toLocaleString('en-IN')}</div>
                    <div class="earnings-label">Total Recharge Amount</div>
                </div>
                <div class="earnings-card">
                    <div class="earnings-amount">{$earnings.rechargeRate}%</div>
                    <div class="earnings-label">Success Rate</div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Subscription Plan Distribution Chart -->
    <div class="earnings-section">
        <div class="section-header">
            <div class="chart-header-content">
                <div class="chart-title-container">
                    <h3 class="section-title">Subscription Distribution</h3>
                    <div class="info-icon" title="Shows distribution of subscription plans sold this month">ℹ️</div>
                </div>
                <div class="chart-actions">
                    <button class="action-btn">⋯</button>
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
                <p>No completed subscriptions found for the selected period.</p>
            </div>
        {:else}
            <div class="chart-container">
                <div id="subscription-chart"></div>
            </div>
            
            <div class="chart-footer">
                <div class="chart-period">
                    <select class="period-select" bind:value={selectedMonthValue} on:change={handleMonthChange}>
                        {#each monthOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <div class="chart-link">
                    <a href="/seller/analytics" class="analytics-link">
                        Detailed Analytics →
                    </a>
                </div>
            </div>
        {/if}
    </div>

    <!-- Recent Transactions -->
    <div class="earnings-section">
        <div class="section-header">
            <h3 class="section-title">Recent Transactions</h3>
        </div>
        
        {#if $isLoading}
            <div class="table-loading">
                <div class="skeleton-row"></div>
                <div class="skeleton-row"></div>
                <div class="skeleton-row"></div>
            </div>
        {:else if $earnings.recentTransactions.length === 0}
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h4>No transactions found</h4>
                <p>No recharge transactions for the selected period.</p>
            </div>
        {:else}
            <div class="transactions-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Device ID</th>
                            <th>Customer</th>
                            <th>Plan</th>
                            <th>Recharge Amount</th>
                            <th>Commission</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each $earnings.recentTransactions as transaction}
                            <tr>
                                <td>{transaction.date}</td>
                                <td>{transaction.deviceId}</td>
                                <td>{transaction.customerName}</td>
                                <td>{transaction.planName}</td>
                                <td>₹{transaction.rechargeAmount.toLocaleString('en-IN')}</td>
                                <td>₹{transaction.commission.toLocaleString('en-IN')}</td>
                                <td>
                                    <span class="status-{transaction.status.toLowerCase()}">
                                        {transaction.status}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

    <!-- Monthly breakdown -->
    <!-- <div class="earnings-section">
        <div class="section-header">
            <h3 class="section-title">Monthly Breakdown</h3>
        </div>
        
        {#if $isLoading}
            <div class="chart-loading">
                <div class="loading-bars">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                </div>
            </div>
        {:else}
            <div class="chart-placeholder">
                <div class="chart-icon">📈</div>
                <div class="chart-title">Earnings Chart</div>
                <div class="chart-subtitle">Monthly earnings and recharge trends</div>
                <div class="chart-bars">
                    {#each $localChartData.slice(-6) as bar}
                        <div 
                            class="bar {bar.name === selectedMonthValue.slice(-2) ? 'active' : ''}" 
                            style="height: {bar.height}%"
                            title="₹{bar.earnings.toLocaleString('en-IN')} from {bar.transactions} transactions"
                        >
                            <span>{bar.name}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div> -->
 
</div>

{#if localChartData.length > 0}
    <script>
        // Initialize ApexCharts after component mounts and data is loaded
        setTimeout(() => {
            if (window.ApexCharts && chartOptions.series) {
                const chart = new ApexCharts(
                    document.querySelector("#subscription-chart"), 
                    chartOptions
                );
                chart.render();
            }
        }, 100);
    </script>
{/if}

<style>
    .dashboard-content {
        padding: 30px 40px;
    }

    .earnings-section {
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

    .earnings-filter {
        display: flex;
        gap: 15px;
    }

    .filter-select {
        padding: 10px 15px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }

    .filter-select:focus {
        outline: none;
        border-color: #667eea;
    }

    .filter-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .export-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        min-width: 120px;
    }

    .export-btn:hover:not(:disabled) {
        background: #5a67d8;
        transform: translateY(-1px);
    }

    .export-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    .earnings-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .earnings-card {
        background: linear-gradient(135deg, #667eea20, #764ba220);
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease;
    }

    .earnings-card:hover {
        transform: translateY(-5px);
    }

    .earnings-amount {
        font-size: 28px;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 5px;
    }

    .earnings-label {
        color: #718096;
        font-size: 14px;
        font-weight: 500;
    }

    /* Chart Styles */
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
    }

    .chart-actions {
        display: flex;
        align-items: center;
    }

    .action-btn {
        background: none;
        border: none;
        font-size: 18px;
        color: #718096;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .action-btn:hover {
        background: #f7fafc;
        color: #4a5568;
    }

    .chart-container {
        min-height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    #subscription-chart {
        width: 100%;
        height: 320px;
    }

    .chart-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
        margin-top: 20px;
    }

    .period-select {
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: transparent;
        color: #718096;
        font-size: 14px;
        cursor: pointer;
    }

    .period-select:focus {
        outline: none;
        border-color: #667eea;
    }

    .analytics-link {
        color: #667eea;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 6px;
        transition: all 0.2s ease;
    }

    .analytics-link:hover {
        background: #667eea10;
        text-decoration: none;
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
        margin-bottom: 5px;
        color: #4a5568;
    }

    .empty-chart p {
        font-size: 14px;
    }

    .transactions-table {
        overflow-x: auto;
    }

    .transactions-table table {
        width: 100%;
        border-collapse: collapse;
    }

    .transactions-table th,
    .transactions-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }

    .transactions-table th {
        background: #f7fafc;
        font-weight: 600;
        color: #4a5568;
        position: sticky;
        top: 0;
    }

    .status-completed {
        background: #c6f6d5;
        color: #22543d;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .status-pending {
        background: #fbb6ce;
        color: #702459;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .status-failed {
        background: #fed7d7;
        color: #742a2a;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .chart-placeholder {
        text-align: center;
        padding: 40px;
        background: linear-gradient(135deg, #f7fafc, #edf2f7);
        border-radius: 12px;
        border: 2px dashed #cbd5e0;
    }

    .chart-icon {
        font-size: 48px;
        margin-bottom: 10px;
    }

    .chart-title {
        font-size: 20px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 5px;
    }

    .chart-subtitle {
        color: #718096;
        font-size: 14px;
        margin-bottom: 20px;
    }

    .chart-bars {
        display: flex;
        justify-content: center;
        align-items: end;
        gap: 15px;
        height: 100px;
        margin-top: 20px;
    }

    .bar {
        width: 40px;
        background: #cbd5e0;
        border-radius: 4px 4px 0 0;
        display: flex;
        align-items: end;
        justify-content: center;
        padding: 5px;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
    }

    .bar:hover {
        background: #a0aec0;
    }

    .bar.active {
        background: #667eea;
    }

    .bar span {
        font-size: 12px;
        font-weight: 600;
        color: #4a5568;
        margin-bottom: -20px;
    }

    .bar.active span {
        color: white;
    }

    /* Loading states */
    .loading-spinner {
        text-align: center;
        padding: 40px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e2e8f0;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .table-loading {
        padding: 20px;
    }

    .skeleton-row {
        height: 50px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        margin-bottom: 10px;
        border-radius: 8px;
    }

    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .chart-loading {
        text-align: center;
        padding: 40px;
    }

    .loading-bars {
        display: flex;
        justify-content: center;
        align-items: end;
        gap: 15px;
        height: 100px;
    }

    .loading-bar {
        width: 40px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px 4px 0 0;
    }

    .loading-bar:nth-child(1) { height: 60%; animation-delay: 0s; }
    .loading-bar:nth-child(2) { height: 80%; animation-delay: 0.2s; }
    .loading-bar:nth-child(3) { height: 40%; animation-delay: 0.4s; }

    .empty-state {
        text-align: center;
        padding: 40px;
        color: #718096;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
    }

    .empty-state h4 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 5px;
        color: #4a5568;
    }

    .empty-state p {
        font-size: 14px;
    }

    /* Error banner */
    .error-banner {
        background: #fed7d7;
        border: 1px solid #feb2b2;
        border-radius: 8px;
        margin: 20px 40px;
    }

    .error-content {
        display: flex;
        align-items: center;
        padding: 15px 20px;
        gap: 10px;
    }

    .error-icon {
        font-size: 20px;
    }

    .error-message {
        flex: 1;
        color: #742a2a;
        font-weight: 500;
    }

    .error-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #742a2a;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .error-close:hover {
        background: #feb2b2;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .dashboard-content {
            padding: 20px;
        }

        .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
        }

        .chart-header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
        }

        .earnings-filter {
            width: 100%;
            justify-content: space-between;
        }

        .filter-select,
        .export-btn {
            flex: 1;
        }

        .earnings-cards {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .earnings-card {
            padding: 15px;
        }

        .earnings-amount {
            font-size: 24px;
        }

        .transactions-table {
            font-size: 14px;
        }

        .transactions-table th,
        .transactions-table td {
            padding: 8px;
        }

        .chart-bars {
            gap: 10px;
        }

        .bar {
            width: 30px;
        }

        .chart-footer {
            flex-direction: column;
            gap: 15px;
        }
    }

    @media (max-width: 480px) {
        .dashboard-content {
            padding: 15px;
        }

        .earnings-section {
            padding: 20px;
        }

        .earnings-cards {
            grid-template-columns: 1fr;
        }

        .section-title {
            font-size: 16px;
        }

        .earnings-filter {
            flex-direction: column;
        }

        .transactions-table {
            font-size: 12px;
        }
    }
</style>