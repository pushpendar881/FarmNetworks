<script>
    import Header from '$lib/components/Header.svelte';
    import { masters } from '$lib/stores/dashboard.js';
    
    let selectedMaster = null;
    
    function selectMaster(master) {
        selectedMaster = master;
    }
</script>

<svelte:head>
    <title>Devices Map - Device Management System</title>
</svelte:head>

<Header title="Devices Map" />

<div class="dashboard-content">
    <div class="map-section">
        <div class="section-header">
            <h3 class="section-title">Device Locations</h3>
            <div class="map-controls">
                <button class="map-btn">📍 Show All</button>
                <button class="map-btn">🔄 Refresh</button>
            </div>
        </div>

        <div class="map-container">
            <div class="map-placeholder">
                <div class="map-icon">🗺️</div>
                <div class="map-title">Interactive Map</div>
                <div class="map-subtitle">Device locations and coverage areas</div>
                
                <!-- Simulated map markers -->
                <div class="map-markers">
                    {#each $masters as master, index}
                    <div 
                    class="map-marker" 
                    class:active={selectedMaster?.id === master.id}
                    style="top: {30 + index * 20}%; left: {20 + index * 30}%;"
                    tabindex="0"
                    role="button"
                    on:click={() => selectMaster(master)}
                    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectMaster(master)}
                >
                            <div class="marker-dot"></div>
                            <div class="marker-label">{master.id}</div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <!-- Device List -->
    <div class="devices-section">
        <div class="section-header">
            <h3 class="section-title">Master Devices</h3>
        </div>

        <div class="devices-grid">
            {#each $masters as master}
            <div 
            class="device-location-card" 
            class:selected={selectedMaster?.id === master.id}
            tabindex="0"
            role="button"
            on:click={() => selectMaster(master)}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectMaster(master)}
        >
                    <div class="location-header">
                        <div class="location-info">
                            <div class="location-name">{master.location}</div>
                            <div class="location-id">{master.id}</div>
                        </div>
                        <div class="location-status" class:online={master.status === 'online'}>
                            {master.status === 'online' ? '🟢' : '🔴'}
                        </div>
                    </div>
                    
                    <div class="location-details">
                        <div class="detail-item">
                            <span class="detail-label">Coverage:</span>
                            <span class="detail-value">{master.range}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Nodes:</span>
                            <span class="detail-value">{master.nodes.length}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Installed:</span>
                            <span class="detail-value">{master.installed}</span>
                        </div>
                    </div>

                    <div class="nodes-summary">
                        <div class="nodes-count">
                            <span class="online-count">
                                {master.nodes.filter(n => n.status === 'online').length} Online
                            </span>
                            <span class="offline-count">
                                {master.nodes.filter(n => n.status === 'offline').length} Offline
                            </span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- Selected Master Details -->
    {#if selectedMaster}
        <div class="master-details-section">
            <div class="section-header">
                <h3 class="section-title">Selected Master: {selectedMaster.location}</h3>
                <button class="close-btn" on:click={() => selectedMaster = null}>✕</button>
            </div>

            <div class="nodes-grid">
                {#each selectedMaster.nodes as node}
                    <div class="node-detail-card">
                        <div class="node-header">
                            <span class="node-id">{node.id}</span>
                            <span class="node-status" class:online={node.status === 'online'}>
                                {node.status}
                            </span>
                        </div>
                        <div class="node-info">
                            <div class="info-row">
                                <span>Last Active:</span>
                                <span>{node.lastActive}</span>
                            </div>
                            <div class="info-row">
                                <span>Recharge:</span>
                                <span>{node.rechargeDate}</span>
                            </div>
                            <div class="info-row">
                                <span>Expiry:</span>
                                <span>{node.expiryDate}</span>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .dashboard-content {
        padding: 30px 40px;
    }

    .map-section, .devices-section, .master-details-section {
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

    .map-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
    }

    .map-btn:hover {
        background: #5a67d8;
    }

    .close-btn {
        background: #e53e3e;
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    }

    .map-container {
        height: 400px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
    }

    .map-placeholder {
        height: 100%;
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .map-icon {
        font-size: 48px;
        margin-bottom: 10px;
    }

    .map-title {
        font-size: 20px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 5px;
    }

    .map-subtitle {
        color: #718096;
        font-size: 14px;
    }

    .map-markers {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
    }

    .map-marker {
        position: absolute;
        cursor: pointer;
        transform: translate(-50%, -50%);
        transition: all 0.3s ease;
    }

    .map-marker:hover {
        transform: translate(-50%, -50%) scale(1.1);
    }

    .marker-dot {
        width: 12px;
        height: 12px;
        background: #667eea;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        margin: 0 auto 5px;
    }

    .map-marker.active .marker-dot {
        background: #e53e3e;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }

    .marker-label {
        background: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        color: #2d3748;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        white-space: nowrap;
    }

    .devices-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
    }

    .device-location-card {
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .device-location-card:hover {
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .device-location-card.selected {
        border-color: #667eea;
        background: #f0f9ff;
    }

    .location-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }

    .location-name {
        font-weight: 600;
        color: #2d3748;
        font-size: 16px;
    }

    .location-id {
        color: #718096;
        font-size: 12px;
        margin-top: 2px;
    }

    .location-status {
        font-size: 20px;
    }

    .location-details {
        margin-bottom: 15px;
    }

    .detail-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
    }

    .detail-label {
        color: #718096;
    }

    .detail-value {
        font-weight: 600;
        color: #2d3748;
    }

    .nodes-summary {
        padding-top: 15px;
        border-top: 1px solid #e2e8f0;
    }

    .nodes-count {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
    }

    .online-count {
        color: #38a169;
        font-weight: 600;
    }

    .offline-count {
        color: #e53e3e;
        font-weight: 600;
    }

    .nodes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
    }

    .node-detail-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 15px;
        background: #f9f9f9;
    }

    .node-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .node-id {
        font-weight: 600;
        color: #2d3748;
    }

    .node-status {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        background: #fed7d7;
        color: #742a2a;
    }

    .node-status.online {
        background: #c6f6d5;
        color: #22543d;
    }

    .node-info {
        font-size: 12px;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
    }

    .info-row span:first-child {
        color: #718096;
    }

    .info-row span:last-child {
        font-weight: 600;
        color: #2d3748;
    }

    @media (max-width: 768px) {
        .dashboard-content {
            padding: 20px;
        }

        .devices-grid, .nodes-grid {
            grid-template-columns: 1fr;
        }

        .map-container {
            height: 300px;
        }
    }
</style>