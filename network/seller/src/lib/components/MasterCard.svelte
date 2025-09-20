<!-- MasterCard.svelte -->
<script>
    import NodeCard from './NodeCard.svelte';
    
    export let master;
    
    let showAllNodes = false;
    const maxNodesToShow = 3; // Show only 3 nodes by default
    
    $: displayedNodes = showAllNodes 
        ? master.nodes 
        : master.nodes?.slice(0, maxNodesToShow) || [];
    
    $: hasMoreNodes = master.nodes && master.nodes.length > maxNodesToShow;
    
    function toggleNodes() {
        showAllNodes = !showAllNodes;
    }
</script>

<div class="master-card">
    <div class="master-header">
        <div class="master-info">
            <h3 class="master-name">{master.name || `Master ${master.id}`}</h3>
            <div class="master-details">
                <span class="master-location">📍 {master.location || 'Location not set'}</span>
                <span class="master-id">ID: {master.id || 'N/A'}</span>
                {#if master.range}
                    <span class="master-range">Range: {master.range}</span>
                {/if}
                {#if master.installed}
                    <span class="master-installed">Installed: {master.installed}</span>
                {/if}
            </div>
            <div class="master-status">
                <span class="status-indicator" class:online={master.status === 'online'} class:offline={master.status !== 'online'}>
                    {master.status === 'online' ? 'Online' : 'Offline'}
                </span>
                <span class="node-count">{master.nodes?.length || 0} nodes</span>
            </div>
        </div>
        <div class="master-stats">
            <div class="stat-item">
                <span class="stat-value">{master.stats?.online || 0}</span>
                <span class="stat-label">Online</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">{master.stats?.total || master.nodes?.length || 0}</span>
                <span class="stat-label">Total</span>
            </div>
        </div>
    </div>

    {#if master.nodes && master.nodes.length > 0}
        <div class="nodes-section">
            <div class="nodes-header">
                <h4 class="nodes-title">Connected Nodes</h4>
                {#if hasMoreNodes}
                    <button class="toggle-nodes-btn" on:click={toggleNodes}>
                        {showAllNodes ? 'Show Less' : `View All (${master.nodes.length})`}
                    </button>
                {/if}
            </div>
            
            <div class="nodes-grid">
                {#each displayedNodes as node}
                    <NodeCard {node} />
                {/each}
            </div>
            
            {#if showAllNodes && master.nodes.length > maxNodesToShow}
                <div class="show-less-container">
                    <button class="show-less-btn" on:click={toggleNodes}>
                        Show Less
                    </button>
                </div>
            {/if}
        </div>
    {:else}
        <div class="no-nodes">
            <p>No nodes connected to this master.</p>
        </div>
    {/if}
</div>

<style>
    .master-card {
        background: white;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        margin-bottom: 25px;
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .master-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 35px rgba(0, 0, 0, 0.12);
    }

    .master-header {
        padding: 25px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        flex-wrap: wrap;
    }

    .master-info {
        flex: 1;
        min-width: 250px;
    }

    .master-name {
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 10px 0;
        line-height: 1.2;
    }

    .master-details {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 15px;
    }

    .master-location, .master-id, .master-range, .master-installed {
        font-size: 14px;
        opacity: 0.9;
    }

    .master-status {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }

    .status-indicator {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }

    .status-indicator.online {
        background: rgba(34, 197, 94, 0.2);
        color: #dcfce7;
    }

    .status-indicator.offline {
        background: rgba(239, 68, 68, 0.2);
        color: #fecaca;
    }

    .node-count {
        font-size: 14px;
        opacity: 0.9;
    }

    .master-stats {
        display: flex;
        gap: 20px;
        flex-shrink: 0;
    }

    .stat-item {
        text-align: center;
        min-width: 60px;
    }

    .stat-value {
        display: block;
        font-size: 24px;
        font-weight: 700;
        line-height: 1;
    }

    .stat-label {
        display: block;
        font-size: 12px;
        opacity: 0.8;
        margin-top: 4px;
        text-transform: uppercase;
    }

    .nodes-section {
        padding: 25px;
    }

    .nodes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        gap: 15px;
        flex-wrap: wrap;
    }

    .nodes-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin: 0;
    }

    .toggle-nodes-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: background 0.3s ease;
        white-space: nowrap;
    }

    .toggle-nodes-btn:hover {
        background: #5a67d8;
    }

    .nodes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
    }

    .show-less-container {
        text-align: center;
        margin-top: 20px;
    }

    .show-less-btn {
        background: #e2e8f0;
        color: #4a5568;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
    }

    .show-less-btn:hover {
        background: #cbd5e0;
        color: #2d3748;
    }

    .no-nodes {
        padding: 40px 25px;
        text-align: center;
        color: #718096;
        font-style: italic;
    }

    /* Tablet responsiveness */
    @media (max-width: 1024px) {
        .master-header {
            padding: 20px;
            gap: 15px;
        }
        
        .master-info {
            min-width: 200px;
        }
        
        .nodes-section {
            padding: 20px;
        }
        
        .nodes-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 12px;
        }
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .master-header {
            padding: 20px 15px;
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
        }
        
        .master-info {
            min-width: auto;
        }
        
        .master-stats {
            justify-content: space-around;
            align-self: stretch;
        }
        
        .nodes-section {
            padding: 20px 15px;
        }
        
        .nodes-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }
        
        .toggle-nodes-btn {
            align-self: flex-start;
        }
        
        .nodes-grid {
            grid-template-columns: 1fr;
            gap: 12px;
        }
    }

    /* Small mobile devices */
    @media (max-width: 480px) {
        .master-card {
            margin-bottom: 20px;
        }
        
        .master-header {
            padding: 15px 12px;
        }
        
        .master-name {
            font-size: 18px;
        }
        
        .master-details {
            gap: 3px;
        }
        
        .master-location, .master-id, .master-range, .master-installed {
            font-size: 13px;
        }
        
        .master-status {
            gap: 10px;
        }
        
        .master-stats {
            gap: 15px;
        }
        
        .stat-value {
            font-size: 20px;
        }
        
        .nodes-section {
            padding: 15px 12px;
        }
        
        .nodes-title {
            font-size: 15px;
        }
    }
</style>