<script>
    export let title;
    export let value;
    export let change;
    export let icon;
    export let iconColor;
    export let positive = true;
</script>

<div class="stat-card">
    <div class="stat-header">
        <span class="stat-title">{title}</span>
        <div class="stat-icon" style="background: {iconColor};">{icon}</div>
    </div>
    <div class="stat-value">{value}</div>
    <div class="stat-change" class:positive class:negative={!positive}>
        {change}
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
    }

    .stat-icon {
        width: 35px;
        height: 35px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
    }

    .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 10px;
    }

    .stat-change {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
    }

    .stat-change.positive {
        color: #38a169;
    }

    .stat-change.negative {
        color: #e53e3e;
    }
</style>