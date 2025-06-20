<script>
    import Header from '$lib/components/Header.svelte';
    import { earnings } from '$lib/stores/dashboard.js';
    
    function exportData() {
        const csvContent = `Date,Device ID,Recharge Amount,Commission,Status
2025-06-18,Node-001,₹300,₹15,Completed
2025-06-17,Node-004,₹300,₹15,Completed
2025-06-16,Node-005,₹300,₹15,Completed
2025-06-15,Node-002,₹300,₹15,Completed
2025-06-14,Node-008,₹300,₹15,Completed`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'earnings_report_june_2025.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
</script>

<svelte:head>
    <title>Earnings & Reports - Device Management System</title>
</svelte:head>

<Header title="Earnings & Reports" />

<div class="dashboard-content">
    <div class="earnings-section">
        <div class="section-header">
            <h3 class="section-title">Seller Earnings (5% Commission)</h3>
            <div class="earnings-filter">
                <select class="filter-select">
                    <option>June 2025</option>
                    <option>May 2025</option>
                    <option>April 2025</option>
                </select>
                <button class="export-btn" on:click={exportData}>Export Data</button>
            </div>
        </div>

        <div class="earnings-cards">
            <div class="earnings-card">
                <div class="earnings-amount">₹{$earnings.thisMonth.toLocaleString()}</div>
                <div class="earnings-label">This Month Earnings</div>
            </div>
            <div class="earnings-card">
                <div class="earnings-amount">{$earnings.devicesRecharged}</div>
                <div class="earnings-label">Devices Recharged</div>
            </div>
            <div class="earnings-card">
                <div class="earnings-amount">₹{$earnings.totalRechargeAmount.toLocaleString()}</div>
                <div class="earnings-label">Total Recharge Amount</div>
            </div>
            <div class="earnings-card">
                <div class="earnings-amount">{$earnings.rechargeRate}%</div>
                <div class="earnings-label">Recharge Rate</div>
            </div>
        </div>
    </div>

    <!-- Recent Transactions -->
    <div class="earnings-section">
        <div class="section-header">
            <h3 class="section-title">Recent Transactions</h3>
        </div>
        <div class="transactions-table">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Device ID</th>
                        <th>Recharge Amount</th>
                        <th>Commission</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>18 Jun 2025</td>
                        <td>Node-001</td>
                        <td>₹300</td>
                        <td>₹15</td>
                        <td><span class="status-completed">Completed</span></td>
                    </tr>
                    <tr>
                        <td>17 Jun 2025</td>
                        <td>Node-004</td>
                        <td>₹300</td>
                        <td>₹15</td>
                        <td><span class="status-completed">Completed</span></td>
                    </tr>
                    <tr>
                        <td>16 Jun 2025</td>
                        <td>Node-005</td>
                        <td>₹300</td>
                        <td>₹15</td>
                        <td><span class="status-completed">Completed</span></td>
                    </tr>
                    <tr>
                        <td>15 Jun 2025</td>
                        <td>Node-002</td>
                        <td>₹300</td>
                        <td>₹15</td>
                        <td><span class="status-completed">Completed</span></td>
                    </tr>
                    <tr>
                        <td>14 Jun 2025</td>
                        <td>Node-008</td>
                        <td>₹300</td>
                        <td>₹15</td>
                        <td><span class="status-pending">Pending</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Monthly breakdown -->
    <div class="earnings-section">
        <div class="section-header">
            <h3 class="section-title">Monthly Breakdown</h3>
        </div>
        <div class="chart-placeholder">
            <div class="chart-icon">📈</div>
            <div class="chart-title">Earnings Chart</div>
            <div class="chart-subtitle">Monthly earnings and recharge trends</div>
            <div class="chart-bars">
                <div class="bar" style="height: 60%"><span>Apr</span></div>
                <div class="bar" style="height: 80%"><span>May</span></div>
                <div class="bar active" style="height: 100%"><span>Jun</span></div>
            </div>
        </div>
    </div>
</div>

<style>
    .dashboard-content {
        padding: 30px 40px;
    }

    .earnings-section {
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

    .earnings-filter {
        display: flex;
        gap: 15px;
    }

    .filter-select {
        padding: 10px 15px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        cursor: pointer;
    }

    .export-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
    }

    .export-btn:hover {
        background: #5a67d8;
    }

    .earnings-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .earnings-card {
        background: linear-gradient(135deg, #667eea20, #764ba220);
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease;
    }

    .earnings-card:hover {
        transform: translateY(-5px);
    }

    .earnings-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
    }

    .earnings-card:hover::before {
        left: 100%;
    }

    .earnings-amount {
        font-size: 28px;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 5px;
    }

    .earnings-label {
        color: #718096;
        font-size: 14px;
        font-weight: 500;
    }

    .transactions-table {
        overflow-x: auto;
    }

    .transactions-table table {
        width: 100%;
        border-collapse: collapse;
    }

    .transactions-table th,
    .transactions-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }

    .transactions-table th {
        background: #f7fafc;
        font-weight: 600;
        color: #4a5568;
    }

    .status-completed {
        background: #c6f6d5;
        color: #22543d;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .status-pending {
        background: #fbb6ce;
        color: #702459;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .chart-placeholder {
        text-align: center;
        padding: 40px;
        background: linear-gradient(135deg, #f7fafc, #edf2f7);
        border-radius: 12px;
        border: 2px dashed #cbd5e0;
    }

    .chart-icon {
        font-size: 48px;
        margin-bottom: 10px;
    }

    .chart-title {
        font-size: 20px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 5px;
    }

    .chart-subtitle {
        color: #718096;
        font-size: 14px;
        margin-bottom: 20px;
    }

    .chart-bars {
        display: flex;
        justify-content: center;
        align-items: end;
        gap: 15px;
        height: 100px;
        margin-top: 20px;
    }

    .bar {
        width: 40px;
        background: #cbd5e0;
        border-radius: 4px 4px 0 0;
        display: flex;
        align-items: end;
        justify-content: center;
        padding: 5px;
        transition: all 0.3s ease;
    }

    .bar.active {
        background: #667eea;
    }

    .bar span {
        font-size: 12px;
        font-weight: 600;
        color: #4a5568;
        margin-bottom: -20px;
    }

    .bar.active span {
        color: white;
    }

    @media (max-width: 768px) {
        .dashboard-content {
            padding: 20px;
        }

        .earnings-filter {
            flex-direction: column;
            gap: 10px;
        }

        .earnings-cards {
            grid-template-columns: 1fr;
        }
    }
</style>