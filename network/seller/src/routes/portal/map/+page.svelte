<script>
    import { onMount, tick } from 'svelte';
    import { supabase } from '$lib/supabase.js';
    import Header from '$lib/components/Header.svelte';
    import { authStore } from '$lib/stores/auth.js';
    
    // Map and data state
    let map;
    let mapContainer;
    let gateways = [];
    let devices = [];
    let selectedGateway = null;
    let loading = true;
    let error = null;
    let currentSellerId = null;
  
    // Filter states
    let showGateways = true;
    let showDevices = true;
    let statusFilter = 'all'; // all, active, inactive
    let deviceStatusFilter = 'all'; // all, online, offline
    let mapType = 'street'; // street, satellite
  
    // Statistics
    let stats = {
      totalGateways: 0,
      activeGateways: 0,
      totalDevices: 0,
      onlineDevices: 0
    };
  
    // Filtered data based on current filters
    $: filteredGateways = gateways.filter(gateway => {
      if (statusFilter === 'all') return true;
      return gateway.status === statusFilter;
    });
  
    $: filteredDevices = devices.filter(device => {
      if (deviceStatusFilter === 'all') return true;
      // motor_status 1 means online, 0 means offline
      const isOnline = device.motor_status === 1;
      return deviceStatusFilter === 'online' ? isOnline : !isOnline;
    });
  
        // Fetch data from Supabase - Seller-specific queries
    async function fetchGateways() {
      try {
        if (!currentSellerId) {
          console.error('No seller ID available');
          gateways = [];
          stats.totalGateways = 0;
          stats.activeGateways = 0;
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('gateways')
          .select('*')
          .eq('seller_id', currentSellerId);

        if (fetchError) throw fetchError;
        
        gateways = data || [];
        stats.totalGateways = gateways.length;
        stats.activeGateways = gateways.filter(g => g.status === 'active').length;
        
      } catch (err) {
        console.error('Error fetching gateways:', err);
        error = 'Failed to load gateways';
      }
    }
  
        async function fetchDevices() {
      try {
        if (!currentSellerId) {
          console.error('No seller ID available');
          devices = [];
          stats.totalDevices = 0;
          stats.onlineDevices = 0;
          return;
        }

        // First, get all gateway IDs for the current seller
        const { data: gatewayIds, error: gatewayError } = await supabase
          .from('gateways')
          .select('id')
          .eq('seller_id', currentSellerId);

        if (gatewayError) throw gatewayError;

        if (!gatewayIds || gatewayIds.length === 0) {
          devices = [];
          stats.totalDevices = 0;
          stats.onlineDevices = 0;
          return;
        }

        // Then fetch devices that belong to those gateways
        const { data, error: fetchError } = await supabase
          .from('devices')
          .select('*')
          .in('gateway_id', gatewayIds.map(g => g.id));

        if (fetchError) throw fetchError;
        
        devices = data || [];
        stats.totalDevices = devices.length;
        stats.onlineDevices = devices.filter(d => d.motor_status === 1).length;
        
      } catch (err) {
        console.error('Error fetching devices:', err);
        error = 'Failed to load devices';
      }
    }
  
    // Initialize Leaflet map
    function initializeMap() {
      console.log('Attempting to initialize map...');
      console.log('window.L available:', typeof window !== 'undefined' && !!window.L);
      console.log('mapContainer available:', !!mapContainer);
      
      if (typeof window !== 'undefined' && window.L && mapContainer) {
        try {
          console.log('Initializing Leaflet map...');
          let defaultCenter = [19.2686, 73.9472];
          if (gateways && gateways.length > 0 && gateways[0].latitude && gateways[0].longitude) {
            defaultCenter = [parseFloat(gateways[0].latitude), parseFloat(gateways[0].longitude)];
          }
          
          // Mobile-optimized map options
          const isMobile = window.innerWidth <= 768;
          const mapOptions = {
            center: defaultCenter,
            zoom: isMobile ? 10 : 12,
            zoomControl: true,
            // Mobile-specific optimizations
            tap: true,
            tapTolerance: 15,
            // Improve performance on mobile
            preferCanvas: isMobile,
            // Better touch handling
            bounceAtZoomLimits: false,
            // Reduce memory usage
            maxZoom: 18,
            minZoom: 3
          };
          
          map = L.map(mapContainer, mapOptions);
    
          console.log('Map initialized successfully');
          updateMapTiles();
          addMarkersToMap();
          
          // Mobile-specific event handling
          if (isMobile) {
            // Prevent zoom on double tap
            map.doubleClickZoom.disable();
            
            // Add touch-friendly zoom controls
            L.control.zoom({
              position: 'bottomright',
              zoomInTitle: 'Zoom in',
              zoomOutTitle: 'Zoom out'
            }).addTo(map);
          }
        } catch (err) {
          console.error('Error initializing map:', err);
          error = 'Failed to initialize map';
        }
      } else {
        console.warn('Map initialization skipped: window.L or mapContainer not available');
        // Retry after a short delay
        setTimeout(() => {
          if (!map && mapContainer) {
            initializeMap();
          }
        }, 100);
      }
    }
  
    function updateMapTiles() {
      if (!map) return;
  
      // Remove existing tile layer
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
  
      // Add new tile layer based on map type
      const tileUrl = mapType === 'satellite' 
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
      const attribution = mapType === 'satellite'
        ? '&copy; <a href="https://www.esri.com/">Esri</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  
      L.tileLayer(tileUrl, { attribution }).addTo(map);
    }
  
// Replace your addMarkersToMap function with this updated version
function addMarkersToMap() {
  if (!map) return;

  // Clear existing markers (except tile layers)
  map.eachLayer(layer => {
    if (!(layer instanceof L.TileLayer)) {
      map.removeLayer(layer);
    }
  });

  // Add gateway markers with pulsing coverage circles
  if (showGateways) {
    filteredGateways.forEach(gateway => {
      if (gateway.latitude && gateway.longitude) {
        const lat = parseFloat(gateway.latitude);
        const lng = parseFloat(gateway.longitude);
        const color = gateway.status === 'active' ? '#a855f7' : '#ef4444';
        
        // Create pulsing circle animation for each gateway
        createPulsingCircle(lat, lng, gateway.coverage_radius, color);
        
        // Gateway marker
        const gatewayIcon = L.divIcon({
          className: 'gateway-marker',
          html: `<div class="gateway-dot ${gateway.status}"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([lat, lng], { icon: gatewayIcon })
          .bindPopup(`
            <div class="popup-content">
              <h4>${gateway.name}</h4>
              <p><strong>Status:</strong> ${gateway.status}</p>
              <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            </div>
          `)
          .addTo(map);

        // Click handler to select gateway
        marker.on('click', () => {
          selectedGateway = gateway;
          fetchGatewayDevices(gateway.id);
        });
      }
    });
  }

  // Add device markers (keep your existing device code)
  if (showDevices) {
    filteredDevices.forEach(device => {
      if (device.latitude && device.longitude) {
        const lat = parseFloat(device.latitude);
        const lng = parseFloat(device.longitude);
        const isOnline = device.motor_status === 1;
        
        // For online devices, create pulsing dot
        if (isOnline) {
          createPulsingDot(lat, lng, '#22c55e');
        }
        
        const deviceIcon = L.divIcon({
          className: 'device-marker',
          html: `<div class="device-dot ${isOnline ? 'online' : 'offline'}"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        L.marker([lat, lng], { icon: deviceIcon })
          .bindPopup(`
            <div class="popup-content">
              <h4>${device.device_name || device.device_id}</h4>
              <p><strong>Status:</strong> ${isOnline ? 'Online' : 'Offline'}</p>
              <p><strong>Customer:</strong> ${device.customer_name || 'Unknown'}</p>
              <p><strong>Last Updated:</strong> ${new Date(device.updated_at).toLocaleString()}</p>
              ${device.customer_phone ? `<p><strong>Phone:</strong> ${device.customer_phone}</p>` : ''}
            </div>
          `)
          .addTo(map);
      }
    });
  }
}

// Add this new function for creating pulsing circles
function createPulsingCircle(lat, lng, baseRadius, color) {
  // Static base circle (coverage area)
  const baseCircle = L.circle([lat, lng], {
    radius: baseRadius,
    color: color,
    fillColor: color,
    fillOpacity: 0.05,
    weight: 1,
  }).addTo(map);

  // Animated pulsing circle
  const pulsingCircle = L.circle([lat, lng], {
    radius: 0,
    color: color,
    fillColor: color,
    fillOpacity: 0,
    weight: 0,
  }).addTo(map);

  // Animation state
  let animationFrame;
  let startTime;
  
  function animatePulse(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const duration = 1500; // 1.5 seconds
    const progress = Math.min(elapsed / duration, 1);
    
    // Calculate radius and opacity
    const currentRadius = baseRadius * progress;
    const currentOpacity = 0.8 * (1 - progress);
    
    // Update circle
    pulsingCircle.setRadius(currentRadius);
    pulsingCircle.setStyle({
      fillOpacity: currentOpacity
    });
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(animatePulse);
    } else {
      // Reset for next pulse
      setTimeout(() => {
        startTime = null;
        animationFrame = requestAnimationFrame(animatePulse);
      }, 1500); // Wait 1.5s before next pulse (total cycle = 3s)
    }
  }
  
  // Start animation
  animationFrame = requestAnimationFrame(animatePulse);
}

// Add this new function for creating pulsing dots (for online devices)
function createPulsingDot(lat, lng, color) {
  // Animated pulsing circle for devices
  const pulsingDot = L.circle([lat, lng], {
    radius: 0,
    color: color,
    fillColor: color,
    fillOpacity: 0,
    weight: 0,
  }).addTo(map);

  // Animation state
  let animationFrame;
  let startTime;
  
  function animateDotPulse(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const duration = 900; // 0.9 seconds
    const progress = Math.min(elapsed / duration, 1);
    
    // Calculate radius and opacity (smaller pulse for devices)
    const currentRadius = 200 * progress; // 200m max radius for devices
    const currentOpacity = 0.4 * (1 - progress);
    
    // Update circle
    pulsingDot.setRadius(currentRadius);
    pulsingDot.setStyle({
      fillOpacity: currentOpacity
    });
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(animateDotPulse);
    } else {
      // Reset for next pulse
      setTimeout(() => {
        startTime = null;
        animationFrame = requestAnimationFrame(animateDotPulse);
      }, 2100); // Wait 2.1s before next pulse (total cycle = 3s)
    }
  }
  
  // Start animation
  animationFrame = requestAnimationFrame(animateDotPulse);
}  
        async function fetchGatewayDevices(gatewayId) {
      try {
        const { data, error: fetchError } = await supabase
          .from('devices')
          .select('*')
          .eq('gateway_id', gatewayId);

        if (fetchError) throw fetchError;
        
        if (selectedGateway) {
          selectedGateway.devices = data || [];
        }
      } catch (err) {
        console.error('Error fetching gateway devices:', err);
      }
    }
  
    function refreshData() {
      if (!currentSellerId) {
        console.warn('Cannot refresh data: no seller ID available');
        return;
      }

      loading = true;
      error = null;
      Promise.all([fetchGateways(), fetchDevices()])
        .finally(() => {
          loading = false;
          // Update map after data is loaded
          if (map) {
            addMarkersToMap();
          } else if (mapContainer && typeof window !== 'undefined' && window.L) {
            // If map isn't initialized yet, try to initialize it
            initializeMap();
          }
        });
    }
  
    // Reactive updates for map
    $: if (map && (showGateways || showDevices || statusFilter || deviceStatusFilter)) {
      addMarkersToMap();
    }
  
    $: if (map && mapType) {
      updateMapTiles();
    }
  
    // Initialize map when container becomes available
    $: if (mapContainer && typeof window !== 'undefined' && window.L && !map) {
      initializeMap();
    }
  
    onMount(async () => {
      console.log('Map component mounted');
      
      // Get current seller ID from auth store
      try {
        const result = await authStore.getCurrentUserProfile();
        if (result.success && result.userType === 'seller') {
          currentSellerId = result.profile.id;
          console.log('Seller ID set:', currentSellerId);
        } else {
          console.error('No seller profile found');
          error = 'Authentication required. Please log in as a seller.';
          return;
        }
      } catch (err) {
        console.error('Error getting seller profile:', err);
        error = 'Authentication error. Please log in again.';
        return;
      }
      
      // Load Leaflet CSS and JS
      if (typeof window !== 'undefined') {
        console.log('Loading Leaflet resources...');
        // Add Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);
  
        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = async () => {
          console.log('Leaflet script loaded');
          // Wait for the next tick to ensure mapContainer is bound
          await tick();
          console.log('Map container ready:', !!mapContainer);
          // Fetch data first, then initialize map
          await refreshData();
          initializeMap();
        };
        script.onerror = (err) => {
          console.error('Failed to load Leaflet script:', err);
          error = 'Failed to load map library';
        };
        document.head.appendChild(script);
      } else {
        // If not in browser, just fetch data
        await refreshData();
      }
    });
  </script>
  
  <svelte:head>
    <title>Device Map - Real-time Location Tracking</title>
  </svelte:head>
  
  <Header title="Device Map" />
  
  <div class="dashboard-content">
    {#if !currentSellerId}
      <div class="no-seller-message">
        <div class="message-card">
          <h3>Authentication Required</h3>
          <p>Please log in to view your device map.</p>
        </div>
      </div>
    {:else}
      <!-- Statistics Cards -->
      <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏢</div>
        <div class="stat-info">
          <div class="stat-number">{stats.totalGateways}</div>
          <div class="stat-label">Total Gateways</div>
          <div class="stat-detail">{stats.activeGateways} Active</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📱</div>
        <div class="stat-info">
          <div class="stat-number">{stats.totalDevices}</div>
          <div class="stat-label">Total Devices</div>
          <div class="stat-detail">{stats.onlineDevices} Online</div>
        </div>
      </div>
  
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-number">{stats.totalDevices > 0 ? Math.round((stats.onlineDevices / stats.totalDevices) * 100) : 0}%</div>
          <div class="stat-label">Online Rate</div>
          <div class="stat-detail">Device Connectivity</div>
        </div>
      </div>
    </div>
  
    <!-- Map Controls -->
    <div class="map-section">
       <div class="section-header"> 
        <h3 class="section-title">Device Locations</h3>
        <!--<div class="map-controls">
          <button class="control-btn" on:click={refreshData} disabled={loading}>
            {loading ? '🔄' : '🔄'} Refresh
          </button>
        </div> -->
      </div>
  
      <!-- Filter Controls -->
      <div class="filter-controls">
        <div class="filter-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={showGateways} />
            <span class="checkmark"></span>
            Show Gateways
          </label>
          
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={showDevices} />
            <span class="checkmark"></span>
            Show Devices
          </label>
        </div>
  
        <div class="filter-group">
          <select bind:value={statusFilter} class="filter-select">
            <option value="all">All Gateways</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="maintenance">Maintenance</option>
          </select>
  
          <select bind:value={deviceStatusFilter} class="filter-select">
            <option value="all">All Devices</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>
  
          <select bind:value={mapType} class="filter-select">
            <option value="street">Street View</option>
            <option value="satellite">Satellite View</option>
          </select>
        </div>
      </div>
  
      <!-- Legend -->
      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot gateway active"></div>
          <span>Active Gateway</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot gateway inactive"></div>
          <span>Inactive Gateway</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot device online"></div>
          <span>Online Device</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot device offline"></div>
          <span>Offline Device</span>
        </div>
      </div>
  
      <!-- Map Container -->
      <div class="map-container">
        {#if loading}
          <div class="map-loading">
            <div class="loading-spinner"></div>
            <p>Loading map data...</p>
          </div>
        {:else if error}
          <div class="map-error">
            <p>❌ {error}</p>
            <button class="retry-btn" on:click={refreshData}>Retry</button>
          </div>
        {:else}
          <div bind:this={mapContainer} class="leaflet-map"></div>
        {/if}
      </div>
    </div>
  
    <!-- Selected Gateway Details -->
    {#if selectedGateway}
      <div class="gateway-details-section">
        <div class="section-header">
          <h3 class="section-title">Gateway Details: {selectedGateway.name}</h3>
          <button class="close-btn" on:click={() => selectedGateway = null}>✕</button>
        </div>
  
        <div class="gateway-info-grid">
          <div class="info-card">
            <h4>Basic Information</h4>
            <div class="info-details">
              <div class="info-row">
                <span>Status:</span>
                <span class="status-badge {selectedGateway.status}">{selectedGateway.status}</span>
              </div>
              <div class="info-row">
                <span>Coordinates:</span>
                <span>{selectedGateway.latitude ? `${selectedGateway.latitude.toFixed(6)}, ${selectedGateway.longitude.toFixed(6)}` : 'Not specified'}</span>
              </div>
              <div class="info-row">
                <span>Coverage:</span>
                <span>{selectedGateway.coverage_radius}m radius</span>
              </div>
              <div class="info-row">
                <!-- <span>Capacity:</span>
                <span>{selectedGateway.current_device_count}/{selectedGateway.max_devices} devices</span> -->
              </div>
            </div>
          </div>
        </div>
  
        <!-- Connected Devices -->
        {#if selectedGateway.devices}
          <div class="devices-section">
            <h4>Connected Devices ({selectedGateway.devices.length})</h4>
            <div class="devices-grid">
              {#each selectedGateway.devices as device}
                <div class="device-card">
                  <div class="device-header">
                    <span class="device-name">{device.device_name || device.device_id}</span>
                    <span class="device-status {device.motor_status === 1 ? 'online' : 'offline'}">
                      {device.motor_status === 1 ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div class="device-details">
                    <div class="detail-row">
                      <span>Customer:</span>
                      <span>{device.customer_name || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                      <span>Last Updated:</span>
                      <span>{new Date(device.updated_at).toLocaleString()}</span>
                    </div>
                    {#if device.customer_phone}
                      <div class="detail-row">
                        <span>Phone:</span>
                        <span>{device.customer_phone}</span>
                      </div>
                    {/if}
                    {#if device.customer_email}
                      <div class="detail-row">
                        <span>Email:</span>
                        <span>{device.customer_email}</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
    {/if}
  </div>
  
  <style>
    :global(.gateway-marker) {
      background: transparent;
      border: none;
    }
  
    :global(.gateway-dot) {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  
    :global(.gateway-dot.active) {
      background: #6366f1;
    }
  
    :global(.gateway-dot.inactive) {
      background: #ef4444;
    }
  
    :global(.gateway-dot.maintenance) {
      background: #f59e0b;
    }
  
    :global(.device-marker) {
      background: transparent;
      border: none;
    }
  
    :global(.device-dot) {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }
  
    :global(.device-dot.online) {
      background: #10b981;
      animation: pulse 2s infinite;
    }
  
    :global(.device-dot.offline) {
      background: #ef4444;
    }
  
    :global(.popup-content) {
      font-size: 14px;
      line-height: 1.4;
    }
  
    :global(.popup-content h4) {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }
  
    :global(.popup-content p) {
      margin: 4px 0;
    }
  
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }
  
    .dashboard-content {
      padding: 30px 40px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .no-seller-message {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .message-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
      text-align: center;
      max-width: 400px;
    }

    .message-card h3 {
      color: #2d3748;
      margin-bottom: 10px;
    }

    .message-card p {
      color: #718096;
    }
  
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
  
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      gap: 20px;
    }
  
    .stat-icon {
      font-size: 40px;
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 15px;
    }
  
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #2d3748;
      line-height: 1;
    }
  
    .stat-label {
      font-size: 14px;
      color: #718096;
      margin-top: 4px;
    }
  
    .stat-detail {
      font-size: 12px;
      color: #38a169;
      font-weight: 600;
      margin-top: 2px;
    }
  
    .map-section {
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
  
    .map-controls {
      display: flex;
      gap: 10px;
    }
  
    .control-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
    }
  
    .control-btn:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
    }
  
    .control-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  
    .filter-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 20px;
      flex-wrap: wrap;
    }
  
    .filter-group {
      display: flex;
      gap: 15px;
      align-items: center;
    }
  
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #4a5568;
      cursor: pointer;
    }
  
    .checkbox-label input[type="checkbox"] {
      accent-color: #667eea;
    }
  
    .filter-select {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      color: #374151;
    }
  
    .legend {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
  
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #4a5568;
    }
  
    .legend-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
  
    .legend-dot.gateway.active {
      background: #6366f1;
    }
  
    .legend-dot.gateway.inactive {
      background: #ef4444;
    }
  
    .legend-dot.device.online {
      background: #10b981;
    }
  
      .legend-dot.device.offline {
    background: #ef4444;
  }

  /* Map marker styles */
  .gateway-marker {
    background: transparent;
    border: none;
  }

  .gateway-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    position: relative;
  }

  .gateway-dot.active {
    background: #6366f1;
  }

  .gateway-dot.inactive {
    background: #ef4444;
  }

  .device-marker {
    background: transparent;
    border: none;
  }

  .device-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  .device-dot.online {
    background: #10b981;
  }

  .device-dot.offline {
    background: #ef4444;
  }

  /* Popup styles */
  :global(.leaflet-popup-content-wrapper) {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.leaflet-popup-content) {
    margin: 12px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.4;
  }

  :global(.leaflet-popup-content h4) {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  :global(.leaflet-popup-content p) {
    margin: 4px 0;
    color: #6b7280;
  }

  :global(.leaflet-popup-content strong) {
    color: #374151;
  }

  .map-container {
    height: 600px;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    border: 1px solid #e5e7eb;
  }
  
    .leaflet-map {
      height: 100%;
      width: 100%;
    }
  
    .map-loading, .map-error {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      color: #64748b;
    }
  
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
  
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  
    .retry-btn {
      margin-top: 10px;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
  
    .gateway-details-section {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
      margin-bottom: 30px;
    }
  
    .close-btn {
      background: #ef4444;
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
  
    .gateway-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 25px;
    }
  
    .info-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px;
      background: #f9fafb;
    }
  
    .info-card h4 {
      margin: 0 0 15px 0;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
  
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
  
    .info-row span:first-child {
      color: #6b7280;
      font-weight: 500;
    }
  
    .info-row span:last-child {
      color: #111827;
      font-weight: 600;
    }
  
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
    }
  
    .status-badge.active {
      background: #d1fae5;
      color: #065f46;
    }
  
    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }
  
    .status-badge.maintenance {
      background: #fef3c7;
      color: #92400e;
    }
  
    .devices-section h4 {
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }
  
    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
    }
  
    .device-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      background: white;
    }
  
    .device-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
  
    .device-name {
      font-weight: 600;
      color: #374151;
    }
  
    .device-status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
  
    .device-status.online {
      background: #d1fae5;
      color: #065f46;
    }
  
    .device-status.offline {
      background: #fee2e2;
      color: #991b1b;
    }
  
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
    }
  
    .detail-row span:first-child {
      color: #6b7280;
    }
  
    .detail-row span:last-child {
      color: #374151;
      font-weight: 500;
    }
  
    @media (max-width: 768px) {
      .dashboard-content {
        padding: 20px;
      }
  
      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }
  
      .filter-group {
        justify-content: center;
      }
  
      .legend {
        justify-content: center;
      }
  
      .map-container {
        height: 400px;
      }
  
      .gateway-info-grid, .devices-grid {
        grid-template-columns: 1fr;
      }
    }
 :global(.animatedCircle) {
  animation: pulseRing 2s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}

@keyframes pulseRing {
  0% {
    transform: scale(1);
    stroke-opacity: 0.4;
    stroke-width: 2;
  }
  50% {
    transform: scale(1.5);
    stroke-opacity: 0.1;
    stroke-width: 10;
  }
  100% {
    transform: scale(1);
    stroke-opacity: 0.4;
    stroke-width: 2;
  }
}
/* Mobile styles that maintain desktop appearance */

@media (max-width: 768px) {
  .dashboard-content {
    padding: 10px;
    width: 100%;
    margin: 0;
    background: #fff;
    box-shadow: none;
    border-radius: 0;
    max-width: none;
    min-height: 100vh;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }

  .stat-card {
    padding: 20px;
    flex-direction: row;
    align-items: center;
    gap: 15px;
  }

  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 24px;
    flex-shrink: 0;
  }

  .stat-number {
    font-size: 24px;
  }

  .stat-label {
    font-size: 13px;
  }

  .stat-detail {
    font-size: 11px;
  }

  .map-section {
    padding: 15px;
    background: #fff;
    border-radius: 0;
    box-shadow: none;
    margin-bottom: 20px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 15px;
  }

  .section-title {
    font-size: 18px;
    margin: 0;
  }

  .filter-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    margin-bottom: 15px;
  }

  .filter-group {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .filter-group:first-child {
    justify-content: flex-start;
    gap: 20px;
  }

  .checkbox-label {
    font-size: 13px;
    white-space: nowrap;
  }

  .filter-select {
    flex: 1;
    min-width: 120px;
    font-size: 13px;
    padding: 10px 12px;
  }

  .legend {
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  .legend-item {
    font-size: 12px;
    gap: 6px;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
  }

  .map-container {
    height: 300px;
    min-height: 250px;
    max-height: 50vh;
    border-radius: 8px;
    overflow: hidden;
    margin: 0;
    width: 100%;
  }

  .gateway-details-section {
    padding: 15px;
    margin-bottom: 20px;
  }

  .gateway-info-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .devices-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .device-card {
    padding: 12px;
  }

  .device-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .detail-row {
    font-size: 12px;
  }
}

@media (min-width: 769px) {
  .map-container {
    height: 600px;
    min-height: 500px;
    max-height: 80vh;
  }
}

/* Additional improvements for very small screens */
@media (max-width: 480px) {
  .dashboard-content {
    padding: 8px;
  }

  .stat-card {
    padding: 15px;
    gap: 12px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .stat-number {
    font-size: 20px;
  }

  .stat-label {
    font-size: 12px;
  }

  .map-section {
    padding: 12px;
  }

  .section-title {
    font-size: 16px;
  }

  .filter-controls {
    gap: 12px;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-group:first-child {
    flex-direction: row;
    justify-content: space-between;
  }

  .checkbox-label {
    font-size: 12px;
  }

  .filter-select {
    width: 100%;
    min-width: auto;
  }

  .legend {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .legend-item {
    font-size: 11px;
  }

  .map-container {
    height: 250px;
    min-height: 200px;
    max-height: 40vh;
  }

  .gateway-details-section {
    padding: 12px;
  }

  .info-card {
    padding: 15px;
  }

  .device-card {
    padding: 10px;
  }

  .detail-row {
    font-size: 11px;
  }
}

/* Touch-friendly improvements */
@media (max-width: 768px) {
  .control-btn,
  .retry-btn,
  .close-btn {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 16px;
  }

  .filter-select {
    min-height: 44px;
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
  }

  /* Improve map touch interactions */
  .leaflet-map {
    touch-action: manipulation;
  }

  /* Better spacing for mobile */
  .section-header {
    margin-bottom: 20px;
  }

  .filter-controls {
    margin-bottom: 20px;
  }

  .legend {
    margin-bottom: 20px;
  }
}

/* Landscape orientation adjustments */
@media (max-width: 768px) and (orientation: landscape) {
  .map-container {
    height: 200px;
    min-height: 180px;
    max-height: 35vh;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-icon {
    width: 35px;
    height: 35px;
    font-size: 18px;
  }

  .stat-number {
    font-size: 18px;
  }
}


  </style>