<script>
    import Header from '$lib/components/Header.svelte';
    import StatCard from '$lib/components/StatCard.svelte';
    import MasterCard from '$lib/components/MasterCard.svelte';
    import { masters, stats } from '$lib/stores/dashboard.js';
    
    let showAllMasters = false;
    
    function toggleAllMasters() {
        showAllMasters = !showAllMasters;
    }
    
    $: displayedMasters = showAllMasters ? $masters : $masters.slice(0, 2);
</script>

<svelte:head>
    <title>Seller Dashboard - Device Management System</title>
</svelte:head>

<Header title="Seller Dashboard" />

<div class="dashboard-content">
    <!-- Stats Grid -->
    <div class="stats-grid">
        <StatCard 
            title="Total Masters" 
            value={$stats.totalMasters} 
            change="All operational" 
            icon="🏢" 
            iconColor="#667eea" 
        />
        <StatCard 
            title="Total Devices" 
            value={$stats.totalDevices} 
            change="↗ +12 new this month" 
            icon="📱" 
            iconColor="#48bb78" 
        />
        <StatCard 
            title="Online Devices" 
            value={$stats.onlineDevices} 
            change="{$stats.uptimePercent}% uptime" 
            icon="🟢" 
            iconColor="#38a169" 
        />
        <StatCard 
            title="Recharged This Month" 
            value={$stats.rechargedThisMonth} 
            change="{$stats.rechargeRate}% recharge rate" 
            icon="💳" 
            iconColor="#ed8936" 
        />
    </div>

    <!-- Masters and Devices Section -->
    <div class="masters-section">
        <div class="section-header">
            <h3 class="section-title">Masters & Connected Devices</h3>
        </div>

        {#each displayedMasters as master}
            <MasterCard {master} />
        {/each}

        <div class="view-all-container">
            <button class="export-btn" on:click={toggleAllMasters}>
                {showAllMasters ? 'Show Less' : `View All ${$stats.totalMasters} Masters`}
            </button>
        </div>
    </div>
</div>

<style>
    .dashboard-content {
        padding: 30px 40px;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
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

    .view-all-container {
        text-align: center;
        margin-top: 20px;
    }

    .export-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
    }

    .export-btn:hover {
        background: #5a67d8;
    }

    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }
        
        .dashboard-content {
            padding: 20px;
        }
    }
</style>