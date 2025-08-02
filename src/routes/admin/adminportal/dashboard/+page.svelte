<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  
  export let data;

  let chartCanvas;
  let statusCanvas;
  let mounted = false;

  onMount(() => {
    mounted = true;
    initCharts();
  });

  function initCharts() {
    // Add delay to ensure Chart.js is loaded
    setTimeout(() => {
      // Growth Chart
      if (typeof Chart !== 'undefined' && chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.monthlyGrowth.map(d => d.month),
            datasets: [{
              label: 'Devices',
              data: data.monthlyGrowth.map(d => d.value),
              backgroundColor: '#3b82f6',
              borderRadius: 4,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.1)' },
                ticks: { color: '#6b7280' }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#6b7280' }
              }
            }
          }
        });
      }

      // Status Chart
      if (typeof Chart !== 'undefined' && statusCanvas) {
        const statusCtx = statusCanvas.getContext('2d');
        new Chart(statusCtx, {
          type: 'doughnut',
          data: {
            labels: ['Online', 'Offline'],
            datasets: [{
              data: [data.onlineDevices, data.offlineDevices],
              backgroundColor: ['#10b981', '#ef4444'],
              borderWidth: 0,
              cutout: '70%'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        });
      }
    }, 100); // Wait 100ms for Chart.js to load
  }

  const metrics = [
    {
      title: 'Total Devices',
      value: data.totalDevices.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: '📱',
      subtitle: 'from last month'
    },
    {
      title: 'Active Masters',
      value: data.activeMasters,
      change: '+3%',
      changeType: 'positive',
      icon: '👥',
      subtitle: 'from last month'
    },
    {
      title: 'Monthly Earnings',
      value: `₹${data.monthlyEarnings.toLocaleString()}`,
      change: '+18%',
      changeType: 'positive',
      icon: '💰',
      subtitle: 'from last month'
    },
    {
      title: 'Online Devices',
      value: data.onlineDevices.toLocaleString(),
      change: '-2%',
      changeType: 'negative',
      icon: '📶',
      subtitle: 'from last month'
    }
  ];
</script>

<svelte:head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</svelte:head>

<div class="dashboard-container">
  <!-- Main Content -->
  <div class="main-content">
    <!-- Header -->
    <div class="header" in:fade={{ delay: 200 }}>
      <div class="welcome-section">
        <h1>Dashboard Overview</h1>
      </div>
      <div class="last-updated">
        <p>Last updated: {new Date().toLocaleString('en-US', { 
          month: 'numeric', 
          day: 'numeric', 
          year: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })}</p>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="dashboard-cards">
      {#each metrics as metric, i}
        <div 
          class="card" 
          in:fly={{ y: 30, delay: 300 + (i * 100) }}
        >
          <div class="card-header">
            <div class="card-icon">
              {metric.icon}
            </div>
            <span class="card-change" class:positive={metric.changeType === 'positive'} class:negative={metric.changeType === 'negative'}>
              {metric.change}
            </span>
          </div>
          <div class="card-value">{metric.value}</div>
          <div class="card-label">{metric.title}</div>
          <div class="card-subtitle">{metric.subtitle}</div>
        </div>
      {/each}
    </div>

    <!-- Charts Section -->
    <div class="charts-section" in:fly={{ y: 30, delay: 800 }}>
      <!-- Monthly Growth Chart -->
      <div class="chart-container">
        <div class="chart-header">
          <div>
            <h3>Monthly Growth</h3>
          </div>
          <div class="chart-controls">
            <button class="control-btn active">6M</button>
            <button class="control-btn">1Y</button>
          </div>
        </div>
        <div class="chart-canvas">
          <canvas bind:this={chartCanvas}></canvas>
        </div>
      </div>

      <!-- Device Status Chart -->
      <div class="chart-container">
        <div class="chart-header">
          <div>
            <h3>Device Status</h3>
          </div>
        </div>
        <div class="chart-canvas status-chart">
          <canvas bind:this={statusCanvas}></canvas>
        </div>
        <div class="device-status-legend">
          <div class="legend-item">
            <div class="legend-indicator online"></div>
            <span class="legend-label">Online: {data.onlineDevices}</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator offline"></div>
            <span class="legend-label">Offline: {data.offlineDevices}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Alerts -->
    <div class="alerts-section" in:fly={{ y: 30, delay: 1000 }}>
      <div class="alerts-header">
        <div>
          <h3>Recent Alerts</h3>
        </div>
        <button class="view-all-btn">View All</button>
      </div>
      
      <div class="alerts-list">
        {#each data.recentAlerts as alert, i}
          <div 
            class="alert-item" 
            class:warning={alert.type === 'warning'}
            class:error={alert.type === 'error'}
            class:info={alert.type === 'info'}
            in:fly={{ x: 30, delay: 1200 + (i * 100) }}
          >
            <div class="alert-icon">
              {#if alert.type === 'warning'}⚠️
              {:else if alert.type === 'error'}🚨
              {:else}ℹ️
              {/if}
            </div>
            <div class="alert-content">
              <div class="alert-id">{alert.id}</div>
              <div class="alert-message">{alert.message}</div>
            </div>
            <div class="alert-time">{alert.time}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
    background-color: #f8fafc;
  }

  .dashboard-container {
    display: flex;
    min-height: 100vh;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    padding: 24px;
    background-color: #f8fafc;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .welcome-section h1 {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .last-updated p {
    color: #6b7280;
    font-size: 14px;
    margin: 0;
  }

  /* Dashboard Cards */
  .dashboard-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background-color: #e0e7ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .card-change {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .card-change.positive {
    background: #d1fae5;
    color: #065f46;
  }

  .card-change.negative {
    background: #fee2e2;
    color: #991b1b;
  }

  .card-value {
    font-size: 28px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .card-label {
    color: #374151;
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 2px;
  }

  .card-subtitle {
    color: #9ca3af;
    font-size: 12px;
  }

  /* Charts Section */
  .charts-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .chart-container {
    background: white;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #e5e7eb;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .chart-header h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #1f2937;
  }

  .chart-controls {
    display: flex;
    gap: 8px;
  }

  .control-btn {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #6b7280;
  }

  .control-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .chart-canvas {
    position: relative;
    height: 250px;
  }

  .status-chart {
    height: 180px;
  }

  .device-status-legend {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 20px;
  }

  .legend-item {
    display: flex;
    align-items: center;
  }

  .legend-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
  }

  .legend-indicator.online {
    background: #10b981;
  }

  .legend-indicator.offline {
    background: #ef4444;
  }

  .legend-label {
    font-size: 14px;
    color: #6b7280;
  }

  /* Alerts Section */
  .alerts-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #e5e7eb;
  }

  .alerts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .alerts-header h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #1f2937;
  }

  .view-all-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
  }

  .view-all-btn:hover {
    background: #2563eb;
  }

  .alerts-list {
    space-y: 1rem;
  }

  .alert-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background: #f9fafb;
    border-radius: 6px;
    border-left: 3px solid #f59e0b;
    transition: all 0.2s ease;
  }

  .alert-item:hover {
    background: #f3f4f6;
  }

  .alert-item.warning {
    border-left-color: #f59e0b;
  }

  .alert-item.error {
    border-left-color: #ef4444;
  }

  .alert-item.info {
    border-left-color: #3b82f6;
  }

  .alert-icon {
    font-size: 16px;
    margin-right: 12px;
    width: 24px;
    text-align: center;
  }

  .alert-content {
    flex: 1;
  }

  .alert-id {
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 2px;
    font-size: 14px;
  }

  .alert-message {
    color: #6b7280;
    font-size: 12px;
  }

  .alert-time {
    color: #9ca3af;
    font-size: 12px;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .charts-section {
      grid-template-columns: 1fr;
    }
    
    .dashboard-cards {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 16px;
    }
    
    .header {
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }
    
    .dashboard-cards {
      grid-template-columns: 1fr;
    }
  }
</style>