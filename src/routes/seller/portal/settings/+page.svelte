<!-- <script>
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.js';

  let sellerData = null;
  let allSellers = [];
  let sellerStats = null;
  let isLoading = false;
  let errorMessage = null;

  // Example 1: Get current seller profile directly
  async function getCurrentSellerProfile() {
    isLoading = true;
    errorMessage = null;
    
    try {
      const result = await authStore.getCurrentUserProfile();
      
      if (result.success && result.userType === 'seller') {
        sellerData = result.profile;
        console.log('Current seller profile:', result.profile);
      } else {
        errorMessage = 'No seller profile found';
      }
    } catch (err) {
      errorMessage = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Example 2: Get all sellers (for admin use)
  async function getAllSellers() {
    isLoading = true;
    errorMessage = null;
    
    try {
      const result = await authStore.getAllSellerProfiles({
        page: 1,
        limit: 5,
        search: '',
        status: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      if (result.success) {
        allSellers = result.sellers;
        console.log('All sellers:', result.sellers);
        console.log('Pagination:', result.pagination);
      } else {
        errorMessage = result.error;
      }
    } catch (err) {
      errorMessage = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Example 3: Get seller statistics
  async function getSellerStatistics() {
    isLoading = true;
    errorMessage = null;
    
    try {
      const result = await authStore.getSellerStatistics();
      
      if (result.success) {
        sellerStats = result.statistics;
        console.log('Seller statistics:', result.statistics);
      } else {
        errorMessage = result.error;
      }
    } catch (err) {
      errorMessage = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Example 4: Get specific seller by ID
  async function getSellerById(sellerId) {
    isLoading = true;
    errorMessage = null;
    
    try {
      const result = await authStore.getSellerProfile(sellerId);
      
      if (result.success) {
        console.log('Specific seller profile:', result.profile);
        alert(`Found seller: ${result.profile.full_name}`);
      } else {
        errorMessage = result.error;
      }
    } catch (err) {
      errorMessage = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Example 5: Update seller profile
  async function updateSellerProfile() {
    if (!sellerData) {
      alert('No seller data to update');
      return;
    }

    isLoading = true;
    errorMessage = null;
    
    try {
      const updateData = {
        full_name: sellerData.full_name,
        phone: sellerData.phone,
        business_name: sellerData.business_name,
        business_type: sellerData.business_type,
        address: sellerData.address,
        city: sellerData.city,
        state: sellerData.state,
        pincode: sellerData.pincode,
        gstin: sellerData.gstin,
        commission_rate: sellerData.commission_rate
      };

      const result = await authStore.updateSellerProfile(sellerData.id, updateData);
      
      if (result.success) {
        alert('Profile updated successfully!');
        await getCurrentSellerProfile(); // Reload data
      } else {
        errorMessage = result.error;
      }
    } catch (err) {
      errorMessage = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Example 6: Search sellers
  async function searchSellers(searchTerm) {
    isLoading = true;
    errorMessage = null;
    
    try {
      const result = await authStore.getAllSellerProfiles({
        page: 1,
        limit: 10,
        search: searchTerm,
        status: 'all'
      });
      
      if (result.success) {
        allSellers = result.sellers;
        console.log('Search results:', result.sellers);
      } else {
        errorMessage = result.error;
      }
    } catch (err) {
      errorMessage = err.message;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    // Load current seller profile on mount
    getCurrentSellerProfile();
  });

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
  <title>Settings - Farm Networks</title>
  <meta name="description" content="Settings and data management examples" />
</svelte:head>

<div class="settings-page">
  <div class="page-header">
    <h1>Settings & Data Examples</h1>
    <p>Examples of how to fetch and manage seller data from the seller_profiles table</p>
  </div>


  {#if errorMessage}
    <div class="error-banner">
      <p>Error: {errorMessage}</p>
      <button on:click={() => errorMessage = null} class="close-btn">×</button>
    </div>
  {/if}


  <div class="action-buttons">
    <button on:click={getCurrentSellerProfile} disabled={isLoading} class="action-btn">
      🔍 Get Current Seller Profile
    </button>
    
    <button on:click={getAllSellers} disabled={isLoading} class="action-btn">
      📋 Get All Sellers (Admin)
    </button>
    
    <button on:click={getSellerStatistics} disabled={isLoading} class="action-btn">
      📊 Get Seller Statistics
    </button>
    
    <button on:click={updateSellerProfile} disabled={isLoading || !sellerData} class="action-btn">
      💾 Update Profile
    </button>
  </div>

  {#if isLoading}
    <div class="loading-indicator">
      <div class="spinner"></div>
      <p>Loading data...</p>
    </div>
  {/if}

 
  {#if sellerData}
    <div class="data-section">
      <h2>Current Seller Profile</h2>
      <div class="data-card">
        <div class="data-row">
          <strong>Name:</strong> {sellerData.full_name || 'N/A'}
        </div>
        <div class="data-row">
          <strong>Email:</strong> {sellerData.email || 'N/A'}
        </div>
        <div class="data-row">
          <strong>Phone:</strong> {sellerData.phone || 'N/A'}
        </div>
        <div class="data-row">
          <strong>Business:</strong> {sellerData.business_name || 'N/A'}
        </div>
        <div class="data-row">
          <strong>Total Sales:</strong> {formatCurrency(sellerData.total_sales)}
        </div>
        <div class="data-row">
          <strong>Rating:</strong> {sellerData.rating > 0 ? `${sellerData.rating.toFixed(1)}/5.0` : 'No rating'}
        </div>
        <div class="data-row">
          <strong>Status:</strong> 
          <span class="status-badge" class:active={sellerData.is_active}>
            {sellerData.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div class="data-row">
          <strong>Joined:</strong> {formatDate(sellerData.created_at)}
        </div>
      </div>
    </div>
  {/if}

  
  {#if sellerStats}
    <div class="data-section">
      <h2>Seller Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{sellerStats.totalSellers}</div>
          <div class="stat-label">Total Sellers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{sellerStats.activeSellers}</div>
          <div class="stat-label">Active Sellers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{formatCurrency(sellerStats.totalSales)}</div>
          <div class="stat-label">Total Sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{sellerStats.averageRating.toFixed(1)}</div>
          <div class="stat-label">Avg Rating</div>
        </div>
      </div>
    </div>
  {/if}

  
  {#if allSellers.length > 0}
    <div class="data-section">
      <h2>All Sellers (Sample)</h2>
      <div class="sellers-list">
        {#each allSellers as seller}
          <div class="seller-item">
            <div class="seller-info">
              <div class="seller-name">{seller.full_name || 'N/A'}</div>
              <div class="seller-email">{seller.email}</div>
              <div class="seller-business">{seller.business_name || 'No business name'}</div>
            </div>
            <div class="seller-actions">
              <button 
                on:click={() => getSellerById(seller.id)}
                class="view-btn"
              >
                👁️ View Details
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="data-section">
    <h2>Search Sellers</h2>
    <div class="search-box">
      <input 
        type="text" 
        placeholder="Search by name, email, or business..."
        on:keydown={(e) => e.key === 'Enter' && searchSellers(e.target.value)}
      />
      <button on:click={() => searchSellers(document.querySelector('input').value)} class="search-btn">
        🔍 Search
      </button>
    </div>
  </div>

  
  <div class="data-section">
    <h2>Code Examples</h2>
    <div class="code-examples">
      <details>
        <summary>Get Current Seller Profile</summary>
        <pre class="code-block">{@html `
// Get current seller profile
const result = await authStore.getCurrentUserProfile();
if (result.success && result.userType === 'seller') {
  const sellerProfile = result.profile;
  console.log(sellerProfile);
}`}</pre>
      </details>

      <details>
        <summary>Get All Sellers with Pagination</summary>
        <pre class="code-block">{@html `
// Get all sellers with options
const result = await authStore.getAllSellerProfiles({
  page: 1,
  limit: 10,
  search: 'search term',
  status: 'active',
  sortBy: 'created_at',
  sortOrder: 'desc'
});

if (result.success) {
  const sellers = result.sellers;
  const pagination = result.pagination;
}`}</pre>
      </details>

      <details>
        <summary>Get Seller Statistics</summary>
        <pre class="code-block">{@html `
// Get seller statistics
const result = await authStore.getSellerStatistics();
if (result.success) {
  const stats = result.statistics;
  console.log('Total sellers:', stats.totalSellers);
  console.log('Total sales:', stats.totalSales);
}`}</pre>
      </details>

      <details>
        <summary>Update Seller Profile</summary>
        <pre class="code-block">{@html `
// Update seller profile
const updateData = {
  full_name: 'New Name',
  phone: '1234567890',
  business_name: 'New Business',
  // ... other fields
};

const result = await authStore.updateSellerProfile(sellerId, updateData);
if (result.success) {
  console.log('Profile updated successfully');
}`}</pre>
      </details>
    </div>
  </div>
</div>

<style>
  .settings-page {
    padding: 30px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .page-header h1 {
    font-size: 32px;
    font-weight: 700;
    color: #2d3748;
    margin: 0 0 10px 0;
  }

  .page-header p {
    font-size: 16px;
    color: #718096;
    margin: 0;
  }

  .error-banner {
    background: #fed7d7;
    color: #742a2a;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #742a2a;
  }

  .action-buttons {
    display: flex;
    gap: 15px;
    margin-bottom: 30px;
    flex-wrap: wrap;
  }

  .action-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
  }

  .action-btn:hover:not(:disabled) {
    background: #5a67d8;
  }

  .action-btn:disabled {
    background: #cbd5e0;
    cursor: not-allowed;
  }

  .loading-indicator {
    text-align: center;
    padding: 40px;
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

  .data-section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
  }

  .data-section h2 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #2d3748;
    font-weight: 600;
  }

  .data-card {
    background: #f7fafc;
    padding: 20px;
    border-radius: 8px;
  }

  .data-row {
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
  }

  .data-row:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    margin-left: 8px;
  }

  .status-badge.active {
    background: #c6f6d5;
    color: #22543d;
  }

  .status-badge.inactive {
    background: #fed7d7;
    color: #742a2a;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.9;
  }

  .sellers-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .seller-item {
    background: #f7fafc;
    padding: 16px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .seller-name {
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 4px;
  }

  .seller-email {
    color: #667eea;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .seller-business {
    color: #718096;
    font-size: 12px;
  }

  .view-btn {
    background: #e6fffa;
    color: #234e52;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .view-btn:hover {
    background: #b2f5ea;
  }

  .search-box {
    display: flex;
    gap: 10px;
  }

  .search-box input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
  }

  .search-box input:focus {
    outline: none;
    border-color: #667eea;
  }

  .search-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .search-btn:hover {
    background: #5a67d8;
  }

  .code-examples {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .code-examples details {
    background: #f7fafc;
    border-radius: 8px;
    overflow: hidden;
  }

  .code-examples summary {
    padding: 16px;
    background: #e2e8f0;
    cursor: pointer;
    font-weight: 600;
    color: #4a5568;
  }

  .code-examples summary:hover {
    background: #cbd5e0;
  }

  .code-block {
    padding: 16px;
    background: #2d3748;
    color: #e2e8f0;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    overflow-x: auto;
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .settings-page {
      padding: 20px;
    }

    .page-header h1 {
      font-size: 24px;
    }

    .action-buttons {
      flex-direction: column;
    }

    .seller-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .search-box {
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style> -->
<script>
  // Settings page logic
</script>

<svelte:head>
  <title>Settings - DeviceNet Seller Dashboard</title>
</svelte:head>

<div class="settings-container">
  <h1>Settings</h1>
  <p>Configure your seller dashboard settings here.</p>
  
  <div class="settings-sections">
    <section class="settings-section">
      <h2>Account Settings</h2>
      <p>Manage your account preferences and information.</p>
    </section>
    
    <section class="settings-section">
      <h2>Notifications</h2>
      <p>Configure your notification preferences.</p>
    </section>
    
    <section class="settings-section">
      <h2>Privacy & Security</h2>
      <p>Manage your privacy and security settings.</p>
    </section>
  </div>
</div>

<style>
  .settings-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .settings-container h1 {
    color: black;
    margin-bottom: 10px;
  }
  
  .settings-container p {
    color: rgba(0, 0, 0, 0.8);
    margin-bottom: 30px;
  }
  
  .settings-sections {
    display: grid;
    gap: 20px;
  }
  
  .settings-section {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(84, 82, 82, 0.2);
    border-radius: 12px;
    padding: 20px;
  }
  
  .settings-section h2 {
    color: rgb(0, 0, 0);
    margin-bottom: 10px;
    font-size: 18px;
  }
  
  .settings-section p {
    color: rgba(0, 0, 0, 0.7);
    margin: 0;
    font-size: 14px;
  }
</style>