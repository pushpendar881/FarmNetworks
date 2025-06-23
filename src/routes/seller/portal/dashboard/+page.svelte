<script>
    import Header from '$lib/components/Header.svelte';
    import StatCard from '$lib/components/StatCard.svelte';
    import MasterCard from '$lib/components/MasterCard.svelte';
    import { masters, stats } from '$lib/stores/dashboard.js';
    import { onMount } from 'svelte';
    import { sellerStore, currentSeller, loading, error } from '$lib/stores/sellerStore.js';
    import { user } from '$lib/stores/auth.js';
    
    let showAllMasters = false;
    let sellerProfile = null;
    let isLoading = true;
    let errorMessage = null;
    
    function toggleAllMasters() {
        showAllMasters = !showAllMasters;
    }
    
    $: displayedMasters = showAllMasters ? $masters : $masters.slice(0, 2);

    onMount(async () => {
        await loadSellerProfile();
    });

    async function loadSellerProfile() {
        isLoading = true;
        errorMessage = null;

        try {
            const result = await sellerStore.loadCurrentSeller();
            
            if (result.success) {
                sellerProfile = result.profile;
            } else {
                errorMessage = result.error;
            }
        } catch (err) {
            errorMessage = err.message;
        } finally {
            isLoading = false;
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

    <!-- <div class="seller-profile">
        <div class="section-header">
            <h3 class="section-title">Seller Profile</h3>
        </div>

        {#if isLoading}
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading your profile...</p>
            </div>
        {:else if errorMessage}
            <div class="error-state">
                <p>Error: {errorMessage}</p>
                <button on:click={loadSellerProfile} class="retry-btn">Retry</button>
            </div>
        {:else if sellerProfile}
            <div class="profile-overview">
                <div class="profile-card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            {($user?.user_metadata?.full_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div class="profile-info">
                            <h2>{sellerProfile.full_name || 'N/A'}</h2>
                            <p class="email">{sellerProfile.email}</p>
                            <p class="phone">{sellerProfile.phone || 'No phone number'}</p>
                        </div>
                    </div>
                </div>

                <div class="business-section">
                    <h3>Business Information</h3>
                    <div class="business-grid">
                        <div class="info-card">
                            <div class="info-label">Business Name</div>
                            <div class="info-value">{sellerProfile.business_name || 'Not set'}</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-label">Business Type</div>
                            <div class="info-value">{sellerProfile.business_type || 'Not specified'}</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-label">GSTIN</div>
                            <div class="info-value">{sellerProfile.gstin || 'Not provided'}</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-label">Commission Rate</div>
                            <div class="info-value">{sellerProfile.commission_rate || 0}%</div>
                        </div>
                    </div>
                </div>

                <div class="address-section">
                    <h3>Address Information</h3>
                    <div class="address-card">
                        <div class="address-details">
                            <p><strong>Address:</strong> {sellerProfile.address || 'Not provided'}</p>
                            <p><strong>City:</strong> {sellerProfile.city || 'Not provided'}</p>
                            <p><strong>State:</strong> {sellerProfile.state || 'Not provided'}</p>
                            <p><strong>Pincode:</strong> {sellerProfile.pincode || 'Not provided'}</p>
                        </div>
                    </div>
                </div>

                <div class="performance-section">
                    <h3>Performance Metrics</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-icon">💰</div>
                            <div class="metric-content">
                                <div class="metric-value">{formatCurrency(sellerProfile.total_sales)}</div>
                                <div class="metric-label">Total Sales</div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">⭐</div>
                            <div class="metric-content">
                                <div class="metric-value">
                                    {#if sellerProfile.rating > 0}
                                        {sellerProfile.rating.toFixed(1)}/5.0
                                    {:else}
                                        No rating yet
                                    {/if}
                                </div>
                                <div class="metric-label">Rating</div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">📅</div>
                            <div class="metric-content">
                                <div class="metric-value">{formatDate(sellerProfile.created_at)}</div>
                                <div class="metric-label">Joined Date</div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">✅</div>
                            <div class="metric-content">
                                <div class="metric-value">
                                    {sellerProfile.is_active ? 'Active' : 'Inactive'}
                                </div>
                                <div class="metric-label">Status</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="debug-section">
                    <h3>Raw Profile Data</h3>
                    <details>
                        <summary>Click to view raw data from seller_profiles table</summary>
                        <pre class="raw-data">{JSON.stringify(sellerProfile, null, 2)}</pre>
                    </details>
                </div>
            </div>
        {:else}
            <div class="no-profile">
                <p>No seller profile found. Please contact support.</p>
            </div>
        {/if}
    </div> -->
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

    .seller-profile {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 30px;
    }

    .loading-state, .error-state, .no-profile {
        text-align: center;
        padding: 60px 20px;
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

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .retry-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        margin-top: 20px;
    }

    .retry-btn:hover {
        background: #5a67d8;
    }

    .profile-overview {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .profile-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .profile-header {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .profile-avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: 700;
    }

    .profile-info h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        color: #2d3748;
    }

    .profile-info .email {
        color: #667eea;
        margin: 0 0 4px 0;
    }

    .profile-info .phone {
        color: #718096;
        margin: 0;
    }

    .business-section, .address-section, .performance-section, .debug-section {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .business-section h3, .address-section h3, .performance-section h3, .debug-section h3 {
        margin: 0 0 20px 0;
        font-size: 20px;
        color: #2d3748;
        font-weight: 600;
    }

    .business-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }

    .info-card {
        padding: 16px;
        background: #f7fafc;
        border-radius: 8px;
        border-left: 4px solid #667eea;
    }

    .info-label {
        font-size: 12px;
        color: #718096;
        text-transform: uppercase;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .info-value {
        font-size: 16px;
        color: #2d3748;
        font-weight: 500;
    }

    .address-card {
        background: #f7fafc;
        padding: 20px;
        border-radius: 8px;
    }

    .address-details p {
        margin: 8px 0;
        color: #4a5568;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .metric-icon {
        font-size: 24px;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
    }

    .metric-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .metric-label {
        font-size: 12px;
        opacity: 0.9;
        text-transform: uppercase;
    }

    .debug-section details {
        background: #f7fafc;
        border-radius: 8px;
        overflow: hidden;
    }

    .debug-section summary {
        padding: 16px;
        background: #e2e8f0;
        cursor: pointer;
        font-weight: 600;
        color: #4a5568;
    }

    .debug-section summary:hover {
        background: #cbd5e0;
    }

    .raw-data {
        padding: 16px;
        background: #2d3748;
        color: #e2e8f0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        overflow-x: auto;
        margin: 0;
    }

    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }
        
        .dashboard-content {
            padding: 20px;
        }

        .profile-header {
            flex-direction: column;
            text-align: center;
        }

        .business-grid {
            grid-template-columns: 1fr;
        }

        .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .metric-card {
            flex-direction: column;
            text-align: center;
        }
    }
</style>