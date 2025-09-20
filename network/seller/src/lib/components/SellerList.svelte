<script>
  import { onMount } from 'svelte'
  import { sellerStore, sellers, loading, error, sellerStats } from '../stores/sellerStore.js'
  import { toasts } from '../stores/toast.js'

  // Component state
  let searchTerm = ''
  let statusFilter = 'all'
  let currentPage = 1
  let pagination = null

  // Load sellers on component mount
  onMount(async () => {
    await loadSellers()
    await loadStats()
  })

  // Load sellers with current filters
  async function loadSellers() {
    const options = {
      page: currentPage,
      limit: 10,
      search: searchTerm,
      status: statusFilter,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }

    const result = await sellerStore.loadAllSellers(options)
    
    if (result.success) {
      pagination = result.pagination
    } else {
      toast.error('Failed to load sellers: ' + result.error)
    }
  }

  // Load seller statistics
  async function loadStats() {
    const result = await sellerStore.loadSellerStats()
    
    if (!result.success) {
      toast.error('Failed to load statistics: ' + result.error)
    }
  }

  // Handle search
  async function handleSearch() {
    currentPage = 1
    await loadSellers()
  }

  // Handle status filter change
  async function handleStatusChange() {
    currentPage = 1
    await loadSellers()
  }

  // Handle pagination
  async function changePage(page) {
    currentPage = page
    await loadSellers()
  }

  // Approve/Reject seller
  async function handleApproval(sellerId, approved) {
    const result = await sellerStore.approveSeller(sellerId, approved, 'admin-id')
    
    if (result.success) {
      toast.success(result.message)
      await loadSellers() // Refresh the list
    } else {
      toast.error('Failed to update seller: ' + result.error)
    }
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  // Format currency
  function formatCurrency(amount) {
    if (!amount) return '₹0.00'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }
</script>

<div class="seller-list-container">
  <!-- Header with Stats -->
  <div class="stats-header">
    <h2>Seller Management</h2>
    {#if $sellerStats}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{$sellerStats.totalSellers}</div>
          <div class="stat-label">Total Sellers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{$sellerStats.activeSellers}</div>
          <div class="stat-label">Active Sellers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{formatCurrency($sellerStats.totalSales)}</div>
          <div class="stat-label">Total Sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{$sellerStats.averageRating.toFixed(1)}</div>
          <div class="stat-label">Avg Rating</div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Search and Filters -->
  <div class="controls">
    <div class="search-box">
      <input 
        type="text" 
        bind:value={searchTerm} 
        placeholder="Search sellers by name, email, or business..."
        on:keydown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button on:click={handleSearch} class="search-btn">
        🔍 Search
      </button>
    </div>
    
    <div class="filters">
      <select bind:value={statusFilter} on:change={handleStatusChange}>
        <option value="all">All Sellers</option>
        <option value="active">Active Only</option>
        <option value="inactive">Inactive Only</option>
      </select>
    </div>
  </div>

  <!-- Loading State -->
  {#if $loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading sellers...</p>
    </div>
  {:else if $error}
    <div class="error">
      <p>Error: {$error}</p>
      <button on:click={loadSellers}>Retry</button>
    </div>
  {:else}
    <!-- Sellers Table -->
    <div class="sellers-table">
      <table>
        <thead>
          <tr>
            <th>Seller Info</th>
            <th>Business Details</th>
            <th>Performance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each $sellers as seller}
            <tr class="seller-row">
              <td class="seller-info">
                <div class="seller-name">{seller.full_name || 'N/A'}</div>
                <div class="seller-email">{seller.email}</div>
                <div class="seller-phone">{seller.phone || 'No phone'}</div>
                <div class="seller-joined">Joined: {formatDate(seller.created_at)}</div>
              </td>
              
              <td class="business-info">
                <div class="business-name">{seller.business_name || 'No business name'}</div>
                <div class="business-type">{seller.business_type || 'N/A'}</div>
                <div class="business-location">
                  {#if seller.city && seller.state}
                    {seller.city}, {seller.state}
                  {:else}
                    Location not set
                  {/if}
                </div>
                <div class="gstin">{seller.gstin || 'No GSTIN'}</div>
              </td>
              
              <td class="performance">
                <div class="total-sales">{formatCurrency(seller.total_sales)}</div>
                <div class="commission-rate">{seller.commission_rate}% commission</div>
                <div class="rating">
                  {#if seller.rating > 0}
                    ⭐ {seller.rating.toFixed(1)}/5.0
                  {:else}
                    No rating yet
                  {/if}
                </div>
              </td>
              
              <td class="status">
                <span class="status-badge" class:active={seller.is_active} class:inactive={!seller.is_active}>
                  {seller.is_active ? 'Active' : 'Inactive'}
                </span>
                {#if seller.approved_at}
                  <div class="approved-date">Approved: {formatDate(seller.approved_at)}</div>
                {/if}
              </td>
              
              <td class="actions">
                <button 
                  class="action-btn view-btn"
                  on:click={() => window.location.href = `/admin/sellers/${seller.id}`}
                >
                  👁️ View
                </button>
                
                {#if seller.is_active}
                  <button 
                    class="action-btn deactivate-btn"
                    on:click={() => handleApproval(seller.id, false)}
                  >
                    ❌ Deactivate
                  </button>
                {:else}
                  <button 
                    class="action-btn activate-btn"
                    on:click={() => handleApproval(seller.id, true)}
                  >
                    ✅ Activate
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if pagination && pagination.totalPages > 1}
      <div class="pagination">
        <button 
          disabled={currentPage === 1}
          on:click={() => changePage(currentPage - 1)}
          class="page-btn"
        >
          ← Previous
        </button>
        
        <span class="page-info">
          Page {currentPage} of {pagination.totalPages} 
          ({pagination.total} total sellers)
        </span>
        
        <button 
          disabled={currentPage === pagination.totalPages}
          on:click={() => changePage(currentPage + 1)}
          class="page-btn"
        >
          Next →
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .seller-list-container {
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .stats-header {
    margin-bottom: 30px;
  }

  .stats-header h2 {
    margin: 0 0 20px 0;
    color: #2d3748;
    font-size: 24px;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.9;
  }

  .controls {
    display: flex;
    gap: 20px;
    margin-bottom: 30px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    display: flex;
    gap: 10px;
    flex: 1;
    min-width: 300px;
  }

  .search-box input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #667eea;
  }

  .search-btn {
    padding: 12px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
  }

  .search-btn:hover {
    background: #5a67d8;
  }

  .filters select {
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  .loading, .error {
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

  .sellers-table {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  th {
    background: #f7fafc;
    padding: 15px;
    text-align: left;
    font-weight: 600;
    color: #4a5568;
    border-bottom: 2px solid #e2e8f0;
  }

  td {
    padding: 15px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }

  .seller-row:hover {
    background: #f7fafc;
  }

  .seller-name {
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 5px;
  }

  .seller-email {
    color: #667eea;
    font-size: 14px;
    margin-bottom: 5px;
  }

  .seller-phone, .seller-joined {
    color: #718096;
    font-size: 12px;
  }

  .business-name {
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 5px;
  }

  .business-type, .business-location, .gstin {
    color: #718096;
    font-size: 12px;
    margin-bottom: 3px;
  }

  .total-sales {
    font-weight: 600;
    color: #38a169;
    margin-bottom: 5px;
  }

  .commission-rate, .rating {
    color: #718096;
    font-size: 12px;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-badge.active {
    background: #c6f6d5;
    color: #22543d;
  }

  .status-badge.inactive {
    background: #fed7d7;
    color: #742a2a;
  }

  .approved-date {
    font-size: 11px;
    color: #718096;
    margin-top: 5px;
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-direction: column;
  }

  .action-btn {
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.3s;
  }

  .view-btn {
    background: #e6fffa;
    color: #234e52;
  }

  .view-btn:hover {
    background: #b2f5ea;
  }

  .activate-btn {
    background: #c6f6d5;
    color: #22543d;
  }

  .activate-btn:hover {
    background: #9ae6b4;
  }

  .deactivate-btn {
    background: #fed7d7;
    color: #742a2a;
  }

  .deactivate-btn:hover {
    background: #feb2b2;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
  }

  .page-btn {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
  }

  .page-btn:hover:not(:disabled) {
    background: #5a67d8;
  }

  .page-btn:disabled {
    background: #cbd5e0;
    cursor: not-allowed;
  }

  .page-info {
    color: #718096;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .search-box {
      min-width: auto;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .sellers-table {
      font-size: 12px;
    }

    th, td {
      padding: 10px 8px;
    }

    .actions {
      flex-direction: row;
    }

    .action-btn {
      padding: 6px 8px;
      font-size: 11px;
    }
  }
</style> 