<!-- <script>
    export let title;
    export let totalCount = 0;
    export let onlineCount = 0;
    export let offlineCount = 0;
    export let blockedCount = 0;
    export let errorCount = 0;
    export let activeCount = 0;
    export let expiredCount = 0;
    export let expiringSoonCount = 0;
    export let iconColor;
    export let loading = false;
    export let type = 'default'; // 'masters', 'devices', 'subscriptions', 'default'
    
    // Calculate counts
    $: displayTotal = totalCount || 0;
    
    // Get status items based on type
    $: statusItems = getStatusItems(type, {
        online: onlineCount || 0,
        offline: offlineCount || 0,
        blocked: blockedCount || 0,
        error: errorCount || 0,
        active: activeCount || 0,
        expired: expiredCount || 0,
        expiringSoon: expiringSoonCount || 0
    });
    
    function getStatusItems(cardType, counts) {
        if (loading) return [];
        
        switch (cardType) {
            case 'masters':
                // Always show online and offline for masters, even if 0
                return [
                    { label: 'Online', count: counts.online, color: 'online' },
                    { label: 'Offline', count: counts.offline, color: 'offline' }
                ];
            
            case 'devices':
                // For devices, show online and offline always, blocked only if > 0
                const deviceItems = [
                    { label: 'Online', count: counts.online, color: 'online' },
                    { label: 'Offline', count: counts.offline, color: 'offline' }
                ];
                
                // Add blocked only if they have values
                if (counts.blocked > 0) {
                    deviceItems.push({ label: 'Blocked', count: counts.blocked, color: 'blocked' });
                }
                
                return deviceItems;
            
            case 'subscriptions':
                return [
                    { label: 'Active', count: counts.active, color: 'online' },
                    { label: 'Expired', count: counts.expired, color: 'offline' },
                    { label: 'Expiring Soon', count: counts.expiringSoon, color: 'warning' }
                ].filter(item => item.count > 0); // Only show non-zero counts for subscriptions
            
            default:
                return [
                    { label: 'Active', count: counts.online, color: 'online' },
                    { label: 'Inactive', count: counts.offline, color: 'offline' }
                ];
        }
    }
    
    function getColorClass(color) {
        switch (color) {
            case 'online': return 'status-online';
            case 'offline': return 'status-offline';
            case 'blocked': return 'status-blocked';
            case 'error': return 'status-error';
            case 'warning': return 'status-warning';
            default: return 'status-default';
        }
    }
    
    function getDotClass(color) {
        switch (color) {
            case 'online': return 'online-dot';
            case 'offline': return 'offline-dot';
            case 'blocked': return 'blocked-dot';
            case 'error': return 'error-dot';
            case 'warning': return 'warning-dot';
            default: return 'default-dot';
        }
    }
</script>

<div class="stat-card">
    <div class="stat-header">
        <span class="stat-title">{title}</span>
        <div class="stat-icon" style="background: {iconColor};">
            {#if loading}
                <div class="icon-spinner"></div>
            {:else}
                {displayTotal}
            {/if}
        </div>
    </div>
    
    <div class="stat-status">
        {#if loading}
            <div class="status-loading">
                <div class="mini-spinner"></div>
                <span>Loading status...</span>
            </div>
        {:else if statusItems.length === 0}
            <div class="no-data">
                <span class="no-data-text">No data available</span>
            </div>
        {:else}
      
            {#if type === 'masters' || type === 'devices'}
                <div class="status-row">
                    {#each statusItems.slice(0, 2) as item}
                        <div class="status-item {getColorClass(item.color)}">
                            <span class="status-dot {getDotClass(item.color)}"></span>
                            <span class="status-text">{item.count} {item.label.toLowerCase()}</span>
                        </div>
                    {/each}
                </div>
             
                {#if statusItems.length > 2}
                    <div class="status-row">
                        {#each statusItems.slice(2) as item}
                            <div class="status-item {getColorClass(item.color)}">
                                <span class="status-dot {getDotClass(item.color)}"></span>
                                <span class="status-text">{item.count} {item.label.toLowerCase()}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            {:else}
               
                {#each statusItems as item}
                    <div class="status-item {getColorClass(item.color)}">
                        <span class="status-dot {getDotClass(item.color)}"></span>
                        <span class="status-text">{item.count} {item.label.toLowerCase()}</span>
                    </div>
                {/each}
            {/if}
        {/if}
    </div>
</div>

<style>
    .stat-card {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(0, 0, 0, 0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        height: 100%;
        box-sizing: border-box;
        min-height: 140px;
    }

    .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    }

    .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }

    .stat-title {
        font-size: 14px;
        color: #718096;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        position: relative;
    }

    .stat-status {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 50px;
    }

    .status-row {
        display: flex;
        gap: 20px;
        align-items: center;
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        padding: 2px 0;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    /* Dot Colors */
    .online-dot {
        background-color: #22c55e;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
    }

    .offline-dot {
        background-color: #6b7280;
        box-shadow: 0 0 6px rgba(107, 114, 128, 0.4);
    }

    .blocked-dot {
        background-color: #ef4444;
        box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
    }

    .error-dot {
        background-color: #f59e0b;
        box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
    }

    .warning-dot {
        background-color: #f97316;
        box-shadow: 0 0 6px rgba(249, 115, 22, 0.4);
    }

    .default-dot {
        background-color: #9ca3af;
        box-shadow: 0 0 6px rgba(156, 163, 175, 0.4);
    }

    /* Text Colors */
    .status-text {
        color: #4a5568;
    }

    .status-online .status-text {
        color: #059669;
    }

    .status-offline .status-text {
        color: #6b7280;
    }

    .status-blocked .status-text {
        color: #dc2626;
    }

    .status-error .status-text {
        color: #d97706;
    }

    .status-warning .status-text {
        color: #ea580c;
    }

    .status-default .status-text {
        color: #6b7280;
    }

    .status-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #718096;
        font-size: 13px;
        padding: 8px 0;
    }

    .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px 0;
    }

    .no-data-text {
        color: #9ca3af;
        font-size: 13px;
        font-style: italic;
    }

    .icon-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .mini-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid #e2e8f0;
        border-top: 2px solid #718096;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .stat-card {
            padding: 20px;
            min-height: 120px;
        }

        .stat-icon {
            width: 45px;
            height: 45px;
            font-size: 18px;
        }

        .status-item {
            font-size: 12px;
        }

        .stat-status {
            gap: 6px;
            min-height: 45px;
        }

        .status-row {
            gap: 15px;
        }
    }

    @media (max-width: 480px) {
        .stat-card {
            padding: 18px;
            min-height: 110px;
        }

        .stat-header {
            margin-bottom: 12px;
        }

        .stat-title {
            font-size: 13px;
        }

        .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 16px;
        }

        .status-item {
            font-size: 11px;
        }

        .stat-status {
            gap: 5px;
            min-height: 40px;
        }

        .status-dot {
            width: 6px;
            height: 6px;
        }

        .status-row {
            gap: 12px;
        }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
        .stat-card {
            transition: none;
        }
        
        .icon-spinner,
        .mini-spinner {
            animation: none;
        }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
        .stat-card {
            border: 2px solid #000;
            box-shadow: none;
        }

        .status-dot {
            border: 1px solid #000;
        }
    }
</style> -->

<script>
    export let title;
    export let totalCount = 0;
    export let onlineCount = 0;
    export let offlineCount = 0;
    export let blockedCount = 0;
    export let errorCount = 0;
    export let activeCount = 0;
    export let expiredCount = 0;
    export let expiringSoonCount = 0;
    export let iconColor;
    export let loading = false;
    export let type = 'default'; // 'masters', 'devices', 'subscriptions', 'default'
    
    // Calculate counts
    $: displayTotal = totalCount || 0;
    
    // Get status items based on type
    $: statusItems = getStatusItems(type, {
        online: onlineCount || 0,
        offline: offlineCount || 0,
        blocked: blockedCount || 0,
        error: errorCount || 0,
        active: activeCount || 0,
        expired: expiredCount || 0,
        expiringSoon: expiringSoonCount || 0
    });
    
    function getStatusItems(cardType, counts) {
        if (loading) return [];
        
        switch (cardType) {
            case 'masters':
                // Always show online and offline for masters, even if 0
                return [
                    { label: 'Online', count: counts.online, color: 'online' },
                    { label: 'Offline', count: counts.offline, color: 'offline' }
                ];
            
            case 'devices':
                // For devices, show online and offline always, blocked only if > 0
                const deviceItems = [
                    { label: 'Online', count: counts.online, color: 'online' },
                    { label: 'Offline', count: counts.offline, color: 'offline' }
                ];
                
                // Add blocked only if they have values
                if (counts.blocked > 0) {
                    deviceItems.push({ label: 'Blocked', count: counts.blocked, color: 'blocked' });
                }
                
                return deviceItems;
            
            case 'subscriptions':
                return [
                    { label: 'Active', count: counts.active, color: 'online' },
                    { label: 'Expired', count: counts.expired, color: 'offline' },
                    { label: 'Expiring Soon', count: counts.expiringSoon, color: 'warning' }
                ].filter(item => item.count > 0); // Only show non-zero counts for subscriptions
            
            default:
                return [
                    { label: 'Active', count: counts.online, color: 'online' },
                    { label: 'Inactive', count: counts.offline, color: 'offline' }
                ];
        }
    }
    
    function getColorClass(color) {
        switch (color) {
            case 'online': return 'status-online';
            case 'offline': return 'status-offline';
            case 'blocked': return 'status-blocked';
            case 'error': return 'status-error';
            case 'warning': return 'status-warning';
            default: return 'status-default';
        }
    }
    
    function getDotClass(color) {
        switch (color) {
            case 'online': return 'online-dot';
            case 'offline': return 'offline-dot';
            case 'blocked': return 'blocked-dot';
            case 'error': return 'error-dot';
            case 'warning': return 'warning-dot';
            default: return 'default-dot';
        }
    }
</script>

<div class="stat-card">
    <div class="stat-header">
        <span class="stat-title">{title}</span>
        <div class="stat-icon" style="background: {iconColor};">
            {#if loading}
                <div class="icon-spinner"></div>
            {:else}
                {displayTotal}
            {/if}
        </div>
    </div>
    
    <div class="stat-status">
        {#if loading}
            <div class="status-loading">
                <div class="mini-spinner"></div>
                <span>Loading status...</span>
            </div>
        {:else if statusItems.length === 0}
            <div class="no-data">
                <span class="no-data-text">No data available</span>
            </div>
        {:else}
            <!-- Display all status items in a single row -->
            <div class="status-row">
                {#each statusItems as item}
                    <div class="status-item {getColorClass(item.color)}">
                        <span class="status-dot {getDotClass(item.color)}"></span>
                        <span class="status-text">{item.count} {item.label.toLowerCase()}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .stat-card {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(0, 0, 0, 0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        height: 100%;
        box-sizing: border-box;
        min-height: 140px;
    }

    .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    }

    .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }

    .stat-title {
        font-size: 14px;
        color: #718096;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        position: relative;
    }

    .stat-status {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 50px;
    }

    .status-row {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        align-items: center;
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        padding: 2px 0;
        flex-shrink: 0;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    /* Dot Colors */
    .online-dot {
        background-color: #22c55e;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
    }

    .offline-dot {
        background-color: #6b7280;
        box-shadow: 0 0 6px rgba(107, 114, 128, 0.4);
    }

    .blocked-dot {
        background-color: #ef4444;
        box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
    }

    .error-dot {
        background-color: #f59e0b;
        box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
    }

    .warning-dot {
        background-color: #f97316;
        box-shadow: 0 0 6px rgba(249, 115, 22, 0.4);
    }

    .default-dot {
        background-color: #9ca3af;
        box-shadow: 0 0 6px rgba(156, 163, 175, 0.4);
    }

    /* Text Colors */
    .status-text {
        color: #4a5568;
        white-space: nowrap;
    }

    .status-online .status-text {
        color: #059669;
    }

    .status-offline .status-text {
        color: #6b7280;
    }

    .status-blocked .status-text {
        color: #dc2626;
    }

    .status-error .status-text {
        color: #d97706;
    }

    .status-warning .status-text {
        color: #ea580c;
    }

    .status-default .status-text {
        color: #6b7280;
    }

    .status-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #718096;
        font-size: 13px;
        padding: 8px 0;
    }

    .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px 0;
    }

    .no-data-text {
        color: #9ca3af;
        font-size: 13px;
        font-style: italic;
    }

    .icon-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .mini-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid #e2e8f0;
        border-top: 2px solid #718096;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .stat-card {
            padding: 20px;
            min-height: 120px;
        }

        .stat-icon {
            width: 45px;
            height: 45px;
            font-size: 18px;
        }

        .status-item {
            font-size: 12px;
        }

        .stat-status {
            gap: 6px;
            min-height: 45px;
        }

        .status-row {
            gap: 12px;
        }
    }

    @media (max-width: 480px) {
        .stat-card {
            padding: 18px;
            min-height: 110px;
        }

        .stat-header {
            margin-bottom: 12px;
        }

        .stat-title {
            font-size: 13px;
        }

        .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 16px;
        }

        .status-item {
            font-size: 11px;
        }

        .stat-status {
            gap: 5px;
            min-height: 40px;
        }

        .status-dot {
            width: 6px;
            height: 6px;
        }

        .status-row {
            gap: 10px;
        }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
        .stat-card {
            transition: none;
        }
        
        .icon-spinner,
        .mini-spinner {
            animation: none;
        }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
        .stat-card {
            border: 2px solid #000;
            box-shadow: none;
        }

        .status-dot {
            border: 1px solid #000;
        }
    }
</style>