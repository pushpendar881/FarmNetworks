<script>
    import NodeCard from './NodeCard.svelte';
    
    export let master;
</script>

<div class="master-card">
    <div class="master-header">
        <div>
            <span class="master-id">{master.id} (Location: {master.location})</span>
            <div class="master-details">{master.range} • Installed: {master.installed}</div>
        </div>
        <span class="master-status" class:status-online={master.status === 'online'} class:status-offline={master.status === 'offline'}>
            {master.status === 'online' ? 'Online' : 'Offline'}
        </span>
    </div>
    <div class="nodes-grid">
        {#each master.nodes as node}
            <NodeCard {node} />
        {/each}
    </div>
</div>

<style>
    .master-card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 20px;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .master-card:hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .master-header {
        background: #f7fafc;
        padding: 15px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .master-id {
        font-weight: 600;
        color: #2d3748;
        font-size: 16px;
    }

    .master-details {
        font-size: 12px;
        color: #718096;
        margin-top: 3px;
    }

    .master-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .status-online {
        background: #c6f6d5;
        color: #22543d;
    }

    .status-offline {
        background: #fed7d7;
        color: #742a2a;
    }

    .nodes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
        padding: 20px;
    }

    @media (max-width: 768px) {
        .nodes-grid {
            grid-template-columns: 1fr;
        }
    }
</style>