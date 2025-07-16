<script>
    export let node;
</script>

<div class="node-card">
    <div class="node-header">
        <span class="node-id">{node.id}</span>
        <span class="node-status" class:status-online={node.status === 'online'} class:status-offline={node.status === 'offline'}>
            {node.status === 'online' ? 'Online' : 'Offline'}
        </span>
    </div>
    <div class="node-info">
        <div class="info-item">
            <span class="info-label">Last Active:</span>
            <span class="info-value">{node.lastActive}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Recharge Date:</span>
            <span class="info-value">{node.rechargeDate}</span>
        </div>
        <!-- <div class="info-item">
            <span class="info-label">Expiry Date:</span>
            <span class="info-value">{node.expiryDate}</span>
        </div> -->
        <div class="info-item">
            <span class="info-label">Install Date:</span>
            <span class="info-value">{node.installDate}</span>
        </div>
    </div>
</div>

<style>
    .node-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 15px;
        background: #f9f9f9;
        transition: all 0.3s ease;
    }

    .node-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

    .node-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        font-size: 13px;
    }

    .info-item {
        display: flex;
        justify-content: space-between;
    }

    .info-label {
        color: #718096;
    }

    .info-value {
        font-weight: 600;
        color: #2d3748;
    }
</style>