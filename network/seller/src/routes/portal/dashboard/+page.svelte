<script>
    import Header from '$lib/components/Header.svelte';
    import StatCard from '$lib/components/StatCard.svelte';
    import MasterCard from '$lib/components/MasterCard.svelte';
    import { 
        masters, 
        stats, 
        earnings,
        loading,
        error,
        initializeDashboard,
        refreshDashboard 
    } from '$lib/stores/dashboard.js';
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/auth.js';
    import { supabase } from '$lib/supabase.js';
    import { goto } from '$app/navigation';
    
    let showAllMasters = false;
    let sellerProfile = null;
    let isLoading = true;
    let errorMessage = null;
    let dashboardError = null;
    
    // Enhanced stats with online/offline counts
    let masterStats = {
        total: 0,
        online: 0,
        offline: 0
    };
    
    let deviceStats = {
        total: 0,
        online: 0,
        offline: 0,
        blocked: 0
    };
    
    let subscriptionStats = {
        total: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0 // expiring within 7 days
    };
    
    // Chart variables - only device status and pie chart
    let deviceStatusChart = null;
    let pieChart = null;
    let deviceStatusChartCanvas = null;
    let pieChartCanvas = null;
    let chartsCreated = false; // Flag to prevent multiple chart creations
    
    function toggleAllMasters() {
        showAllMasters = !showAllMasters;
    }
    
    function navigateToAddMaster() {
        goto('/portal/add-master');
    }

    $: displayedMasters = showAllMasters ? $masters : $masters.slice(0, 2);

    // Reactive data for device status pie chart (without error devices)
    $: devicePieData = [
        { 
            name: 'Online', 
            value: deviceStats.online || 0, 
            color: '#22c55e' 
        },
        { 
            name: 'Offline', 
            value: deviceStats.offline || 0, 
            color: '#6b7280' 
        },
        { 
            name: 'Blocked', 
            value: deviceStats.blocked || 0, 
            color: '#ef4444' 
        }
    ].filter(item => item.value > 0);

    onMount(async () => {
        await loadData();
        // Only create charts once after data is loaded
        if (!chartsCreated) {
            createCharts();
            chartsCreated = true;
        }
    });

    async function loadData() {
        isLoading = true;
        errorMessage = null;
        dashboardError = null;

        try {
            // Load seller profile first using the updated auth store
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                errorMessage = 'User not authenticated';
                return;
            }

            // Get user profile from user_profiles table
            const { data: userProfile, error: userError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (userError) {
                errorMessage = 'Failed to load user profile';
                return;
            }

            // Check if user is a seller
            if (userProfile.role !== 'seller') {
                errorMessage = 'Access denied. Seller account required.';
                return;
            }

            // Get seller profile from seller_profiles table
            const { data: sellerProfileData, error: sellerError } = await supabase
                .from('seller_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (sellerError) {
                errorMessage = 'Failed to load seller profile';
                return;
            }

            // Combine user and seller profile data
            sellerProfile = {
                ...userProfile,
                ...sellerProfileData
            };
            
            // Load enhanced stats
            await loadEnhancedStats();
            
            // Initialize dashboard with seller ID
            const dashboardResult = await initializeDashboard(user.id);
            
            if (!dashboardResult.success) {
                dashboardError = dashboardResult.error || 'Failed to load dashboard data';
            }
        } catch (err) {
            console.error('Error loading data:', err);
            errorMessage = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function loadEnhancedStats() {
        if (!sellerProfile) return;
        
        try {
            // Load Master/Gateway Stats
            await loadMasterStats();
            
            // Load Device Stats (without error devices)
            await loadDeviceStats();
            
            // Load Subscription Stats
            await loadSubscriptionStats();
            
        } catch (err) {
            console.error('Error loading enhanced stats:', err);
        }
    }

    async function loadMasterStats() {
        // Get all gateways for this seller
        const { data: gateways, error } = await supabase
            .from('gateways')
            .select('id, name, status')
            .eq('seller_id', sellerProfile.id);

        if (error) {
            console.error('Error loading gateways:', error);
            return;
        }

        if (gateways) {
            masterStats.total = gateways.length;
            masterStats.online = gateways.filter(g => g.status === 'active').length;
            masterStats.offline = gateways.filter(g => g.status === 'inactive' || g.status === 'maintenance').length;
        }
    }

    async function loadDeviceStats() {
        // Get seller's gateways first
        const { data: gateways } = await supabase
            .from('gateways')
            .select('id')
            .eq('seller_id', sellerProfile.id);

        if (!gateways || gateways.length === 0) {
            deviceStats = { total: 0, online: 0, offline: 0, blocked: 0 };
            return;
        }

        const gatewayIds = gateways.map(g => g.id);
        
        // Get all devices in seller's gateways (excluding error devices from stats)
        const { data: devices, error } = await supabase
            .from('devices')
            .select('device_id, motor_status, is_blocked')
            .in('gateway_id', gatewayIds);

        if (error) {
            console.error('Error loading devices:', error);
            return;
        }

        if (devices) {
            // Only count non-error devices
            const validDevices = devices.filter(d => !d.error_status || d.error_status === 0);
            
            deviceStats.total = validDevices.length;
            deviceStats.blocked = validDevices.filter(d => d.is_blocked === true).length;
            
            // Online: not blocked, motor running
            deviceStats.online = validDevices.filter(d => 
                d.is_blocked === false && d.motor_status === 1
            ).length;
            
            // Offline: not blocked, motor not running
            deviceStats.offline = validDevices.filter(d => 
                d.is_blocked === false && d.motor_status === 0
            ).length;
        }
    }

    async function loadSubscriptionStats() {
        // Get seller's gateways first
        const { data: gateways } = await supabase
            .from('gateways')
            .select('id')
            .eq('seller_id', sellerProfile.id);

        if (!gateways || gateways.length === 0) {
            subscriptionStats = { total: 0, active: 0, expired: 0, expiringSoon: 0 };
            return;
        }

        const gatewayIds = gateways.map(g => g.id);
        
        // Get devices in seller's gateways
        const { data: sellerDevices } = await supabase
            .from('devices')
            .select('device_id')
            .in('gateway_id', gatewayIds);

        if (!sellerDevices || sellerDevices.length === 0) {
            subscriptionStats = { total: 0, active: 0, expired: 0, expiringSoon: 0 };
            return;
        }

        const deviceIds = sellerDevices.map(d => d.device_id);
        
        // Get all subscriptions for these devices
        const { data: allSubscriptions, error: allError } = await supabase
            .from('subscriptions')
            .select('device_id, valid_until')
            .in('device_id', deviceIds);

        if (!allError && allSubscriptions) {
            const currentDate = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(currentDate.getDate() + 7);

            // Get unique devices with subscriptions
            const uniqueDevices = [...new Set(allSubscriptions.map(s => s.device_id))];
            subscriptionStats.total = uniqueDevices.length;

            // Group subscriptions by device and find the latest valid_until for each
            const deviceLatestSubscription = {};
            allSubscriptions.forEach(sub => {
                const deviceId = sub.device_id;
                const validUntil = new Date(sub.valid_until);
                
                if (!deviceLatestSubscription[deviceId] || validUntil > deviceLatestSubscription[deviceId]) {
                    deviceLatestSubscription[deviceId] = validUntil;
                }
            });

            // Count active, expired, and expiring soon
            let active = 0;
            let expired = 0;
            let expiringSoon = 0;

            Object.values(deviceLatestSubscription).forEach(validUntil => {
                if (validUntil > currentDate) {
                    active++;
                    if (validUntil <= sevenDaysFromNow) {
                        expiringSoon++;
                    }
                } else {
                    expired++;
                }
            });

            subscriptionStats.active = active;
            subscriptionStats.expired = expired;
            subscriptionStats.expiringSoon = expiringSoon;
        }
    }

    async function handleRefresh() {
        if (sellerProfile) {
            await loadEnhancedStats(); 
            await refreshDashboard(sellerProfile.id);
            // Only update chart data, don't recreate charts
            updateChartData();
        }
    }

    function createCharts() {
        // Destroy existing charts
        if (deviceStatusChart) deviceStatusChart.destroy();
        if (pieChart) pieChart.destroy();

        // Create charts after a small delay to ensure canvas elements are ready
        setTimeout(() => {
            createDeviceStatusStackedChart();
            createDeviceStatusPieChart();
        }, 100);
    }

//     async function createDeviceStatusStackedChart() {
//     const monthlyDeviceData = await loadMonthlyDeviceData();
    
//     if (deviceStatusChartCanvas && monthlyDeviceData.length > 0) {
//         const ctx = deviceStatusChartCanvas.getContext('2d');
        
//         deviceStatusChart = new Chart(ctx, {
//             type: 'bar',
//             data: {
//                 labels: monthlyDeviceData.map(d => d.date),
//                 datasets: [
//                     {
//                         label: 'Total Devices',
//                         data: monthlyDeviceData.map(d => d.total),
//                         backgroundColor: '#3b82f6', // Blue
//                         borderWidth: 0,
//                         borderRadius: 4
//                     },
//                     {
//                         label: 'New Devices', 
//                         data: monthlyDeviceData.map(d => d.newDevices),
//                         backgroundColor: '#10b981', // Green
//                         borderWidth: 0,
//                         borderRadius: 4
//                     }
//                 ]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: {
//                         display: true,
//                         position: 'bottom',
//                         labels: {
//                             usePointStyle: true,
//                             padding: 15,
//                             font: { size: 12 }
//                         }
//                     },
//                     tooltip: {
//                         mode: 'index',
//                         intersect: false,
//                         callbacks: {
//                             label: function(context) {
//                                 return context.dataset.label + ': ' + context.raw;
//                             },
//                             afterBody: function(tooltipItems) {
//                                 const dataIndex = tooltipItems[0].dataIndex;
//                                 const monthData = monthlyDeviceData[dataIndex];
//                                 return [
//                                     '',
//                                     `Growth: ${monthData.growth > 0 ? '+' : ''}${monthData.growth} devices`,
//                                     `Growth Rate: ${monthData.growthRate}%`
//                                 ];
//                             }
//                         }
//                     }
//                 },
//                 scales: {
//                     x: {
//                         grid: { display: false },
//                         ticks: { 
//                             font: { size: 11 },
//                             maxRotation: 45
//                         }
//                     },
//                     y: {
//                         beginAtZero: true,
//                         grid: { color: '#f1f5f9' },
//                         ticks: { 
//                             font: { size: 11 }, 
//                             stepSize: 1,
//                             callback: function(value) {
//                                 return Math.round(value);
//                             }
//                         }
//                     }
//                 },
//                 interaction: { intersect: false, mode: 'index' }
//             }
//         });
//     }
// }

async function createDeviceStatusStackedChart() {
    const monthlyDeviceData = await loadMonthlyDeviceData();
    
    if (deviceStatusChartCanvas && monthlyDeviceData.length > 0) {
        const ctx = deviceStatusChartCanvas.getContext('2d');
        
        deviceStatusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyDeviceData.map(d => d.date),
                datasets: [
                    {
                        label: 'Existing Devices',
                        data: monthlyDeviceData.map(d => d.total - d.newDevices),
                        backgroundColor: '#3b82f6', // Blue
                        borderWidth: 0
                    },
                    {
                        label: 'New Devices', 
                        data: monthlyDeviceData.map(d => d.newDevices),
                        backgroundColor: '#10b981', // Green
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw;
                            },
                            footer: function(tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                const monthData = monthlyDeviceData[dataIndex];
                                return `Total Devices: ${monthData.total}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { 
                            font: { size: 11 },
                            maxRotation: 45
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { 
                            font: { size: 11 }, 
                            stepSize: 1,
                            callback: function(value) {
                                return Math.round(value);
                            }
                        }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }
}

// async function loadMonthlyDeviceData() {
//     if (!sellerProfile) return [];
    
//     try {
//         const currentDate = new Date();
//         const monthlyData = [];
        
//         // Get seller's gateways first
//         const { data: gateways } = await supabase
//             .from('gateways')
//             .select('id')
//             .eq('seller_id', sellerProfile.id);
            
//         if (!gateways || gateways.length === 0) {
//             return Array.from({length: 7}, (_, i) => {
//                 const targetDate = new Date(currentDate);
//                 targetDate.setMonth(currentDate.getMonth() - (6 - i));
//                 return {
//                     date: targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
//                     total: 0,
//                     newDevices: 0,
//                     growth: 0,
//                     growthRate: 0
//                 };
//             });
//         }

//         const gatewayIds = gateways.map(g => g.id);
        
//         // Get data for last 7 months
//         for (let i = 6; i >= 0; i--) {
//             const targetDate = new Date(currentDate);
//             targetDate.setMonth(currentDate.getMonth() - i);
            
//             const dateStr = targetDate.toLocaleDateString('en-US', { 
//                 month: 'short', 
//                 year: '2-digit' 
//             });
            
//             // Get devices created up to this month
//             const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
//             const { data: totalDevices } = await supabase
//                 .from('devices')
//                 .select('device_id, created_at')
//                 .in('gateway_id', gatewayIds)
//                 .lte('created_at', endOfMonth.toISOString());
            
//             // Get devices created in this specific month
//             const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
//             const { data: newDevicesInMonth } = await supabase
//                 .from('devices')
//                 .select('device_id')
//                 .in('gateway_id', gatewayIds)
//                 .gte('created_at', startOfMonth.toISOString())
//                 .lte('created_at', endOfMonth.toISOString());
            
//             const totalCount = totalDevices ? totalDevices.length : 0;
//             const newCount = newDevicesInMonth ? newDevicesInMonth.length : 0;
            
//             // Calculate growth from previous month
//             const previousTotal = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].total : 0;
//             const growth = totalCount - previousTotal;
//             const growthRate = previousTotal > 0 ? Math.round((growth / previousTotal) * 100) : 0;
            
//             monthlyData.push({
//                 date: dateStr,
//                 total: totalCount,
//                 newDevices: newCount,
//                 growth: growth,
//                 growthRate: growthRate
//             });
//         }
        
//         return monthlyData;
        
//     } catch (err) {
//         console.error('Error loading monthly device data:', err);
//         return [];
//     }
// }

async function loadMonthlyDeviceData() {
    if (!sellerProfile) return [];
    
    try {
        const currentDate = new Date();
        const monthlyData = [];
        
        // Get seller's gateways first
        const { data: gateways } = await supabase
            .from('gateways')
            .select('id')
            .eq('seller_id', sellerProfile.id);
            
        if (!gateways || gateways.length === 0) {
            return Array.from({length: 7}, (_, i) => {
                const targetDate = new Date(currentDate);
                targetDate.setMonth(currentDate.getMonth() - (6 - i));
                return {
                    date: targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    total: 0,
                    newDevices: 0,
                    growth: 0,
                    growthRate: 0
                };
            });
        }

        const gatewayIds = gateways.map(g => g.id);
        
        // Get data for last 7 months
        for (let i = 6; i >= 0; i--) {
            const targetDate = new Date(currentDate);
            targetDate.setMonth(currentDate.getMonth() - i);
            
            const dateStr = targetDate.toLocaleDateString('en-US', { 
                month: 'short', 
                year: '2-digit' 
            });
            
            // Get devices created up to this month
            const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            const { data: totalDevices } = await supabase
                .from('devices')
                .select('device_id, created_at')
                .in('gateway_id', gatewayIds)
                .lte('created_at', endOfMonth.toISOString());
            
            // Get devices created in this specific month
            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const { data: newDevicesInMonth } = await supabase
                .from('devices')
                .select('device_id')
                .in('gateway_id', gatewayIds)
                .gte('created_at', startOfMonth.toISOString())
                .lte('created_at', endOfMonth.toISOString());
            
            const totalCount = totalDevices ? totalDevices.length : 0;
            const newCount = newDevicesInMonth ? newDevicesInMonth.length : 0;
            
            // Calculate growth from previous month
            const previousTotal = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].total : 0;
            const growth = totalCount - previousTotal;
            const growthRate = previousTotal > 0 ? Math.round((growth / previousTotal) * 100) : 0;
            
            monthlyData.push({
                date: dateStr,
                total: totalCount,
                newDevices: newCount,
                growth: growth,
                growthRate: growthRate
            });
        }
        
        return monthlyData;
        
    } catch (err) {
        console.error('Error loading monthly device data:', err);
        return [];
    }
}

    function createDeviceStatusPieChart() {
        if (pieChartCanvas && devicePieData.length > 0) {
            const ctx = pieChartCanvas.getContext('2d');
            
            pieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: devicePieData.map(d => d.name),
                    datasets: [{
                        data: devicePieData.map(d => d.value),
                        backgroundColor: devicePieData.map(d => d.color),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.raw / total) * 100);
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
    }
  

    async function loadMonthlyDeviceStatusData() {
    if (!sellerProfile) return [];
    
    try {
        const currentDate = new Date();
        const monthlyData = [];
        
        // Get data for last 7 months
        for (let i = 6; i >= 0; i--) {
            const targetDate = new Date(currentDate);
            targetDate.setMonth(currentDate.getMonth() - i);
            
            // Format as month/year (e.g., "Feb 25" or "03/25")
            const dateStr = targetDate.toLocaleDateString('en-US', { 
                month: 'short', 
                year: '2-digit' 
            });
            
            // Get seller's gateways
            const { data: gateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('seller_id', sellerProfile.id);
                
            if (gateways && gateways.length > 0) {
                const gatewayIds = gateways.map(g => g.id);
                
                // Since we don't have historical device status data in the database,
                // we'll simulate realistic monthly variations for demonstration
                // In a real application, you would store historical device status data
                
                // Get current device count as baseline
                const { data: allDevices } = await supabase
                    .from('devices')
                    .select('device_id, is_blocked, motor_status, error_status')
                    .in('gateway_id', gatewayIds);
                
                if (allDevices) {
                    // Filter out error devices
                    const validDevices = allDevices.filter(d => !d.error_status || d.error_status === 0);
                    const totalDevices = validDevices.length;
                    
                    // Create realistic variations for each month
                    // This is a simulation - in production you'd query historical data
                    let monthlyVariation;
                    switch (i) {
                        case 6: // 6 months ago
                            monthlyVariation = { online: 0.6, offline: 0.35, blocked: 0.05 };
                            break;
                        case 5: // 5 months ago
                            monthlyVariation = { online: 0.65, offline: 0.3, blocked: 0.05 };
                            break;
                        case 4: // 4 months ago
                            monthlyVariation = { online: 0.7, offline: 0.25, blocked: 0.05 };
                            break;
                        case 3: // 3 months ago
                            monthlyVariation = { online: 0.68, offline: 0.28, blocked: 0.04 };
                            break;
                        case 2: // 2 months ago
                            monthlyVariation = { online: 0.72, offline: 0.24, blocked: 0.04 };
                            break;
                        case 1: // 1 month ago
                            monthlyVariation = { online: 0.75, offline: 0.22, blocked: 0.03 };
                            break;
                        case 0: // Current month - use actual data
                        default:
                            const blocked = validDevices.filter(d => d.is_blocked === true).length;
                            const online = validDevices.filter(d => 
                                d.is_blocked === false && d.motor_status === 1
                            ).length;
                            const offline = validDevices.filter(d => 
                                d.is_blocked === false && d.motor_status === 0
                            ).length;
                            
                            monthlyData.push({
                                date: dateStr,
                                blocked: blocked,
                                online: online,
                                offline: offline
                            });
                            continue;
                    }
                    
                    // Calculate counts based on variations for historical months
                    const online = Math.round(totalDevices * monthlyVariation.online);
                    const blocked = Math.round(totalDevices * monthlyVariation.blocked);
                    const offline = totalDevices - online - blocked;
                    
                    monthlyData.push({
                        date: dateStr,
                        blocked: Math.max(0, blocked),
                        online: Math.max(0, online),
                        offline: Math.max(0, offline)
                    });
                } else {
                    monthlyData.push({
                        date: dateStr,
                        blocked: 0,
                        online: 0,
                        offline: 0
                    });
                }
            } else {
                monthlyData.push({
                    date: dateStr,
                    blocked: 0,
                    online: 0,
                    offline: 0
                });
            }
        }
        
        return monthlyData;
        
    } catch (err) {
        console.error('Error loading monthly device status data:', err);
        return [];
    }
}

// function updateChartData() {
//     // Update pie chart data without recreating the entire chart
//     if (pieChart && devicePieData.length > 0) {
//         pieChart.data.labels = devicePieData.map(d => d.name);
//         pieChart.data.datasets[0].data = devicePieData.map(d => d.value);
//         pieChart.data.datasets[0].backgroundColor = devicePieData.map(d => d.color);
//         pieChart.update('none');
//     }

//     // Update bar chart data with monthly device data
//     if (deviceStatusChart) {
//         loadMonthlyDeviceData().then(monthlyDeviceData => {
//             if (monthlyDeviceData.length > 0) {
//                 deviceStatusChart.data.labels = monthlyDeviceData.map(d => d.date);
//                 deviceStatusChart.data.datasets[0].data = monthlyDeviceData.map(d => d.total);
//                 deviceStatusChart.data.datasets[1].data = monthlyDeviceData.map(d => d.newDevices);
//                 deviceStatusChart.update('none');
//             }
//         });
//     }
// }   
function updateChartData() {
    // Update pie chart data without recreating the entire chart
    if (pieChart && devicePieData.length > 0) {
        pieChart.data.labels = devicePieData.map(d => d.name);
        pieChart.data.datasets[0].data = devicePieData.map(d => d.value);
        pieChart.data.datasets[0].backgroundColor = devicePieData.map(d => d.color);
        pieChart.update('none');
    }

    // Update bar chart data with monthly device data
    if (deviceStatusChart) {
        loadMonthlyDeviceData().then(monthlyDeviceData => {
            if (monthlyDeviceData.length > 0) {
                deviceStatusChart.data.labels = monthlyDeviceData.map(d => d.date);
                deviceStatusChart.data.datasets[0].data = monthlyDeviceData.map(d => d.total);
                deviceStatusChart.data.datasets[1].data = monthlyDeviceData.map(d => d.newDevices);
                deviceStatusChart.update('none');
            }
        });
    }
}

</script>

<svelte:head>
    <title>Seller Dashboard - Device Management System</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</svelte:head>

<Header title="Seller Dashboard" />

<div class="dashboard-content">
    {#if isLoading}
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading dashboard...</p>
        </div>
    {:else if errorMessage}
        <div class="error-container">
            <h3>Error Loading Data</h3>
            <p>{errorMessage}</p>
            <button class="retry-btn" on:click={loadData}>Retry</button>
        </div>
    {:else}
        <!-- Dashboard Controls -->
        <div class="dashboard-controls">
            <div class="last-updated">
                Last updated: {new Date().toLocaleString()}
            </div>
            <button class="refresh-btn" on:click={handleRefresh} disabled={$loading.stats || $loading.masters}>
                {#if $loading.stats || $loading.masters}
                    <span class="spinner-small"></span>
                    Refreshing...
                {:else}
                    🔄 Refresh Data
                {/if}
            </button>
        </div>

        {#if dashboardError}
            <div class="dashboard-error">
                <p>⚠️ {dashboardError}</p>
            </div>
        {/if}

        <!-- Enhanced Stats Grid -->
        <div class="stats-grid">
            <StatCard 
                title="Gateway Masters" 
                totalCount={masterStats.total}
                onlineCount={masterStats.online}
                offlineCount={masterStats.offline}
                iconColor="#667eea"
                loading={$loading.stats}
                type="masters"
            />
            <StatCard 
                title="Connected Devices" 
                totalCount={deviceStats.total}
                onlineCount={deviceStats.online}
                offlineCount={deviceStats.offline}
                blockedCount={deviceStats.blocked}
                iconColor="#48bb78"
                loading={$loading.stats}
                type="devices"
            />
            <StatCard 
                title="Device Subscriptions" 
                totalCount={subscriptionStats.total}
                activeCount={subscriptionStats.active}
                expiredCount={subscriptionStats.expired}
                expiringSoonCount={subscriptionStats.expiringSoon}
                iconColor="#38a169"
                loading={$loading.stats}
                type="subscriptions"
            /> 
        </div>

        <!-- Charts Section - Only 2 Charts -->
        <div class="charts-grid">
            <!-- Device Status Chart -->
            <div class="chart-card">
                <h3 class="chart-title">Weekly Device Status Trends</h3>
                <div class="chart-container">
                    <canvas bind:this={deviceStatusChartCanvas} width="400" height="300"></canvas>
                </div>
            </div>

            <!-- Device Status Pie Chart -->
            <div class="chart-card">
                <h3 class="chart-title">Current Device Status Distribution</h3>
                <div class="chart-container">
                    <canvas bind:this={pieChartCanvas} width="400" height="300"></canvas>
                </div>
            </div>
        </div>

        <!-- Masters and Devices Section -->
        <div class="masters-section">
            <div class="section-header">
                <h3 class="section-title">Masters & Connected Devices</h3>
                <div class="section-actions">
                    <button class="add-master-btn" on:click={navigateToAddMaster}>
                        ➕ Add Master
                    </button>
                    {#if $error.masters}
                        <span class="error-badge">Error loading masters</span>
                    {/if}
                </div>
            </div>

            {#if $loading.masters}
                <div class="loading-masters">
                    <div class="spinner"></div>
                    <p>Loading masters and devices...</p>
                </div>
            {:else if $error.masters}
                <div class="masters-error">
                    <p>Failed to load masters: {$error.masters}</p>
                    <button class="retry-btn" on:click={() => loadData()}>Retry</button>
                </div>
            {:else if $masters.length === 0}
                <div class="no-masters">
                    <p>No masters found. Please contact support to set up your gateway devices.</p>
                </div>
            {:else}
                {#each displayedMasters as master}
                    <MasterCard {master} />
                {/each}

                {#if $masters.length > 2}
                    <div class="view-all-container">
                        <button class="export-btn" on:click={toggleAllMasters}>
                            {showAllMasters ? 'Show Less' : `View All ${masterStats.total} Masters`}
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</div>

<style>
    .dashboard-content {
        padding: 30px 40px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow-x: hidden;
    }

    .loading-container, .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
    }

    .dashboard-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        flex-wrap: wrap;
        gap: 15px;
    }

    .last-updated {
        color: #718096;
        font-size: 0.875rem;
        flex-shrink: 0;
    }

    .refresh-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.3s ease;
        white-space: nowrap;
    }

    .refresh-btn:hover:not(:disabled) {
        background: #5a67d8;
    }

    .refresh-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .dashboard-error {
        background: #fed7d7;
        color: #c53030;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        border-left: 4px solid #e53e3e;
        word-wrap: break-word;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
        width: 100%;
    }

    .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
        width: 100%;
    }

    /* Responsive chart grid for 2 charts */
    @media (min-width: 768px) {
        .charts-grid {
            grid-template-columns: 1fr 1fr;
        }
    }

    @media (max-width: 767px) {
        .charts-grid {
            grid-template-columns: 1fr;
        }
    }

    .chart-card {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .chart-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 20px;
    }

    .chart-container {
        position: relative;
        height: 300px;
        width: 100%;
        max-width: 100%;
    }

    .masters-section {
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        width: 100%;
        box-sizing: border-box;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        flex-wrap: wrap;
        gap: 15px;
    }

    .section-title {
        font-size: 20px;
        font-weight: 600;
        color: #2d3748;
        margin: 0;
    }

    .section-actions {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }

    .add-master-btn {
        background: #48bb78;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: background 0.3s ease;
        white-space: nowrap;
    }

    .add-master-btn:hover {
        background: #38a169;
    }

    .error-badge {
        background: #fed7d7;
        color: #c53030;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
    }

    .loading-masters {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
    }

    .masters-error {
        background: #fed7d7;
        color: #c53030;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        border-left: 4px solid #e53e3e;
        margin: 20px 0;
    }

    .masters-error p {
        margin: 0 0 15px 0;
        font-weight: 500;
    }

    .no-masters {
        background: #f7fafc;
        color: #4a5568;
        padding: 40px 20px;
        border-radius: 8px;
        text-align: center;
        border: 2px dashed #cbd5e0;
        margin: 20px 0;
    }

    .no-masters p {
        margin: 0;
        font-size: 16px;
        line-height: 1.5;
    }

    .view-all-container {
        display: flex;
        justify-content: center;
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
    }

    .export-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.3s ease;
        min-width: 120px;
    }

    .export-btn:hover {
        background: #5a67d8;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .retry-btn {
        background: #e53e3e;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: background 0.3s ease;
    }

    .retry-btn:hover {
        background: #c53030;
    }

    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
    }

    .spinner-small {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
        .dashboard-content {
            padding: 20px 25px;
        }

        .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
        }

        .charts-grid {
            grid-template-columns: 1fr;
            gap: 20px;
        }

        .chart-card {
            padding: 20px;
        }

        .masters-section {
            padding: 20px;
        }
    }

    @media (max-width: 768px) {
        .dashboard-content {
            padding: 15px 20px;
        }

        .dashboard-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }

        .last-updated {
            text-align: center;
            order: 2;
        }

        .refresh-btn {
            order: 1;
            justify-content: center;
        }

        .stats-grid {
            grid-template-columns: 1fr;
            gap: 15px;
        }

        .charts-grid {
            gap: 15px;
        }

        .chart-card {
            padding: 15px;
        }

        .chart-container {
            height: 250px;
        }

        .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }

        .section-actions {
            justify-content: center;
        }

        .masters-section {
            padding: 15px;
        }
    }

    @media (max-width: 480px) {
        .dashboard-content {
            padding: 10px 15px;
        }

        .stats-grid {
            gap: 12px;
        }

        .chart-container {
            height: 200px;
        }

        .section-title {
            font-size: 18px;
            text-align: center;
        }

        .add-master-btn, .export-btn, .refresh-btn {
            width: 100%;
            justify-content: center;
        }

        .view-all-container {
            margin-top: 20px;
        }
    }

    /* Loading states */
    .loading-container p, .loading-masters p {
        color: #718096;
        font-size: 16px;
        margin: 0;
    }

    .error-container h3 {
        color: #e53e3e;
        margin: 0 0 10px 0;
        font-size: 20px;
    }

    .error-container p {
        color: #718096;
        margin: 0 0 20px 0;
        font-size: 16px;
        line-height: 1.5;
    }

    /* Chart responsiveness */
    canvas {
        max-width: 100%;
        height: auto !important;
    }

    /* Accessibility improvements */
    .refresh-btn:focus,
    .add-master-btn:focus,
    .export-btn:focus,
    .retry-btn:focus {
        outline: 2px solid #667eea;
        outline-offset: 2px;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
        .dashboard-content {
            background: white;
            color: black;
        }

        .chart-card,
        .masters-section {
            border: 2px solid #000;
            box-shadow: none;
        }

        .refresh-btn,
        .add-master-btn,
        .export-btn {
            border: 2px solid currentColor;
        }
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
        .spinner,
        .spinner-small {
            animation: none;
        }

        .export-btn:hover,
        .refresh-btn,
        .add-master-btn,
        .retry-btn {
            transform: none;
            transition: none;
        }
    }

    /* Print styles */
    @media print {
        .dashboard-controls,
        .section-actions {
            display: none;
        }

        .chart-card,
        .masters-section {
            box-shadow: none;
            border: 1px solid #000;
        }

        .dashboard-content {
            padding: 0;
        }
    }
</style>
