<script>
  import SellerList from '$lib/components/SellerList.svelte';
  import { sellerStore, sellerStats, loading } from '$lib/stores/sellerStore.js';
  import { onMount } from 'svelte';

  // Load seller statistics on component mount
  onMount(async () => {
    await sellerStore.loadSellerStats();
  });

  // Format currency
  function formatCurrency(amount) {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }
</script>

<svelte:head>
  <title>Admin Dashboard - Farm Networks</title>
  <meta name="description" content="Admin dashboard for managing sellers and system overview" />
</svelte:head>

<div class="admin-dashboard">
  <div class="dashboard-header">
    <h1>Admin Dashboard</h1>
    <p>Manage sellers and monitor system performance</p>
  </div>

  <!-- Quick Stats -->
  {#if $sellerStats}
    <div class="quick-stats">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-number">{$sellerStats.totalSellers}</div>
          <div class="stat-label">Total Sellers</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-number">{$sellerStats.activeSellers}</div>
          <div class="stat-label">Active Sellers</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-number">{formatCurrency($sellerStats.totalSales)}</div>
          <div class="stat-label">Total Sales</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-number">{$sellerStats.averageRating.toFixed(1)}</div>
          <div class="stat-label">Avg Rating</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Seller Management Section -->
  <div class="seller-management">
    <h2>Seller Management</h2>
    <SellerList />
  </div>
</div>

<style>
  .admin-dashboard {
    padding: 30px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .dashboard-header h1 {
    font-size: 36px;
    font-weight: 700;
    color: #2d3748;
    margin: 0 0 10px 0;
  }

  .dashboard-header p {
    font-size: 18px;
    color: #718096;
    margin: 0;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .stat-card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .stat-icon {
    font-size: 32px;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
  }

  .stat-content {
    flex: 1;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #718096;
    font-weight: 500;
  }

  .seller-management {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .seller-management h2 {
    padding: 24px 24px 0 24px;
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #2d3748;
  }

  @media (max-width: 768px) {
    .admin-dashboard {
      padding: 20px;
    }

    .dashboard-header h1 {
      font-size: 28px;
    }

    .dashboard-header p {
      font-size: 16px;
    }

    .quick-stats {
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .stat-card {
      padding: 16px;
    }

    .stat-icon {
      font-size: 24px;
      width: 50px;
      height: 50px;
    }

    .stat-number {
      font-size: 20px;
    }
  }
</style>
  