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
              backgroundColor: function(context) {
                const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0,'#667eea');
                // gradient.addColorStop(1, '#764ba2');
                return gradient;
              },
              borderRadius: 8,
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
      // icon: '📱',
      color: 'from-blue-400 to-blue-600'
    },
    {
      title: 'Active Masters',
      value: data.activeMasters,
      change: '+3%',
      changeType: 'positive',
      // icon: '👥',
      color: 'from-purple-400 to-purple-600'
    },
    {
      title: 'Monthly Earnings',
      value: `₹${data.monthlyEarnings.toLocaleString()}`,
      change: '+18%',
      changeType: 'positive',
      // icon: '💰',
      color: 'from-green-400 to-green-600'
    },
    {
      title: 'Online Devices',
      value: data.onlineDevices.toLocaleString(),
      change: '-2%',
      changeType: 'negative',
      // icon: '📶',
      color: 'from-indigo-400 to-indigo-600'
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
        <p>Welcome back, Admin</p>
      </div>
      <div class="last-updated">
        <p><strong>Last updated:</strong></p>
        <p>{new Date().toLocaleString()}</p>
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
            <!-- <div class="card-icon bg-gradient-to-br {metric.color}">
              {metric.icon}
            </div> -->
            <span class="card-change" class:positive={metric.changeType === 'positive'} class:negative={metric.changeType === 'negative'}>
              {metric.change}
            </span>
          </div>
          <div class="card-value">{metric.value}</div>
          <div class="card-label">{metric.title}</div>
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
            <p>Device count progression over time</p>
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
            <p>Real-time connectivity</p>
          </div>
        </div>
        <div class="chart-canvas status-chart">
          <canvas bind:this={statusCanvas}></canvas>
        </div>
        <div class="device-status-legend">
          <div class="legend-item">
            <div class="legend-indicator online"></div>
            <span class="legend-label">Online</span>
            <span class="legend-value">{data.onlineDevices}</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator offline"></div>
            <span class="legend-label">Offline</span>
            <span class="legend-value">{data.offlineDevices}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Alerts -->
    <div class="alerts-section" in:fly={{ y: 30, delay: 1000 }}>
      <div class="alerts-header">
        <div>
          <h3>Recent Alerts</h3>
          <p>Monitor system notifications and warnings</p>
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
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    min-height: 100vh;
  }

  .dashboard-container {
    display: flex;
    min-height: 100vh;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .welcome-section h1 {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #000000, rgb(16, 10, 21));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.5rem 0;
  }

  .welcome-section p {
    color: #6b7280;
    font-size: 1.1rem;
    margin: 0;
  }

  .last-updated {
    text-align: right;
    font-size: 0.9rem;
    color: #6b7280;
  }

  /* Dashboard Cards */
  .dashboard-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .card:hover {
    transform: translateY(-10px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .card-icon {
    width: 60px;
    height: 60px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: white;
  }

  .card-change {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
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
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #1a202c, #2d3748);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .card-label {
    color: #6b7280;
    font-weight: 500;
  }

  /* Charts Section */
  .charts-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .chart-container {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .chart-header h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: #1a202c;
  }

  .chart-header p {
    color: #6b7280;
    margin: 0;
    font-size: 0.9rem;
  }

  .chart-controls {
    display: flex;
    gap: 0.5rem;
  }

  .control-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #e5e7eb;
    background: white;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .control-btn.active {
    background: linear-gradient(135deg, #667eea);
    color: white;
    border-color: transparent;
  }

  .chart-canvas {
    position: relative;
    height: 300px;
  }

  .status-chart {
    height: 200px;
  }

  .device-status-legend {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: rgba(102, 126, 234, 0.05);
    border-radius: 10px;
  }

  .legend-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 0.75rem;
  }

  .legend-indicator.online {
    background: #10b981;
  }

  .legend-indicator.offline {
    background: #ef4444;
  }

  .legend-label {
    flex: 1;
    font-weight: 500;
    color: #374151;
  }

  .legend-value {
    font-weight: 600;
    color: #1a202c;
  }

  /* Alerts Section */
  .alerts-section {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .alerts-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .alerts-header h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: #1a202c;
  }

  .alerts-header p {
    color: #6b7280;
    margin: 0;
    font-size: 0.9rem;
  }

  .view-all-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .view-all-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .alerts-list {
    space-y: 1rem;
  }

  .alert-item {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    margin-bottom: 1rem;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 15px;
    border-left: 4px solid #f59e0b;
    transition: all 0.3s ease;
  }

  .alert-item:hover {
    transform: translateX(5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
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
    font-size: 1.5rem;
    margin-right: 1rem;
    width: 40px;
    text-align: center;
  }

  .alert-content {
    flex: 1;
  }

  .alert-id {
    font-weight: 600;
    color: #1a202c;
    margin-bottom: 0.25rem;
  }

  .alert-message {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .alert-time {
    color: #9ca3af;
    font-size: 0.8rem;
  }

  /* Utility Classes */
  .bg-gradient-to-br {
    background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
  }

  .from-blue-400 {
    --tw-gradient-from: #60a5fa;
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(96, 165, 250, 0));
  }

  .to-blue-600 {
    --tw-gradient-to: #2563eb;
  }

  .from-purple-400 {
    --tw-gradient-from: #a78bfa;
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(167, 139, 250, 0));
  }

  .to-purple-600 {
    --tw-gradient-to: #9333ea;
  }

  .from-green-400 {
    --tw-gradient-from: #4ade80;
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(74, 222, 128, 0));
  }

  .to-green-600 {
    --tw-gradient-to: #16a34a;
  }

  .from-indigo-400 {
    --tw-gradient-from: #818cf8;
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(129, 140, 248, 0));
  }

  .to-indigo-600 {
    --tw-gradient-to: #4f46e5;
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
      padding: 1rem;
    }
    
    .header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .dashboard-cards {
      grid-template-columns: 1fr;
    }
  }
</style>