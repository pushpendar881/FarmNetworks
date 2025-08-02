  import { supabase } from '../../../../lib/supabase.js'; // Adjust import path as needed

  export async function load() {
    try {
      // Parallel data fetching for better performance
      const [
        devicesData,
        sellersData,
        subscriptionsData,
        earningsData,
        gatewaysData,
        monthlyGrowthData,
        previousMonthData
      ] = await Promise.all([
        fetchDevicesStats(),
        fetchSellersStats(),
        fetchSubscriptionsStats(),
        fetchEarningsStats(),
        fetchGatewaysStats(),
        fetchMonthlyGrowth(),
        fetchPreviousMonthComparison()
      ]);

      // Calculate derived metrics
      const totalDevices = devicesData.total;
      const onlineDevices = devicesData.online;
      const offlineDevices = devicesData.offline;
      const activeMasters = sellersData.activeMasters;
      const monthlyEarnings = earningsData.currentMonth;
      const monthlyGrowth = monthlyGrowthData;

      // Calculate growth percentages
      const deviceGrowth = calculateGrowthPercentage(totalDevices, previousMonthData.totalDevices);
      const masterGrowth = calculateGrowthPercentage(activeMasters, previousMonthData.activeMasters);
      const earningsGrowth = calculateGrowthPercentage(monthlyEarnings, previousMonthData.monthlyEarnings);
      const onlineGrowth = calculateGrowthPercentage(onlineDevices, previousMonthData.onlineDevices);

      // Generate recent alerts based on device status and subscription data
      const recentAlerts = await generateRecentAlerts();

      return {
        totalDevices,
        activeMasters,
        monthlyEarnings,
        onlineDevices,
        offlineDevices,
        monthlyGrowth,
        recentAlerts,
        // Growth metrics for the cards
        growthMetrics: {
          deviceGrowth: `${deviceGrowth > 0 ? '+' : ''}${deviceGrowth}%`,
          masterGrowth: `${masterGrowth > 0 ? '+' : ''}${masterGrowth}%`,
          earningsGrowth: `${earningsGrowth > 0 ? '+' : ''}${earningsGrowth}%`,
          onlineGrowth: `${onlineGrowth > 0 ? '+' : ''}${onlineGrowth}%`
        },
        // Additional data for expanded dashboard
        additionalStats: {
          totalSellers: sellersData.total,
          approvedSellers: sellersData.approved,
          pendingSellers: sellersData.pending,
          totalGateways: gatewaysData.total,
          activeGateways: gatewaysData.active,
          totalSubscriptions: subscriptionsData.total,
          activeSubscriptions: subscriptionsData.active,
          expiringSubscriptions: subscriptionsData.expiring,
          totalRevenue: earningsData.totalRevenue,
          pendingPayments: earningsData.pendingPayments,
          averageDevicesPerGateway: gatewaysData.total > 0 ? Math.round(totalDevices / gatewaysData.total) : 0,
          systemHealth: {
            uptime: Math.round((onlineDevices / totalDevices) * 100) || 0,
            errorDevices: devicesData.errorDevices || 0,
            maintenanceGateways: gatewaysData.maintenance || 0
          }
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Return fallback data in case of error
      return {
        totalDevices: 0,
        activeMasters: 0,
        monthlyEarnings: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        monthlyGrowth: [],
        recentAlerts: [],
        growthMetrics: {
          deviceGrowth: '+0%',
          masterGrowth: '+0%',
          earningsGrowth: '+0%',
          onlineGrowth: '+0%'
        },
        error: 'Failed to load dashboard data',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Fetch comprehensive device statistics
  async function fetchDevicesStats() {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('motor_status, error_status, created_at, last_updated');

    if (error) throw error;

    const total = devices.length;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Consider device online if last_updated is within 5 minutes
    const online = devices.filter(device => 
      new Date(device.last_updated) > fiveMinutesAgo
    ).length;
    
    const offline = total - online;
    
    // Count devices with error status
    const errorDevices = devices.filter(device => 
      device.error_status && device.error_status !== 0
    ).length;

    return { total, online, offline, errorDevices };
  }

  // Fetch seller/master statistics
  async function fetchSellersStats() {
    const { data: sellers, error } = await supabase
      .from('seller_profiles')
      .select('is_approved, created_at');

    if (error) throw error;

    const total = sellers.length;
    const approved = sellers.filter(seller => seller.is_approved).length;
    const pending = total - approved;
    const activeMasters = approved; // Assuming approved sellers are active masters

    return { total, approved, pending, activeMasters };
  }

  // Fetch subscription statistics
  async function fetchSubscriptionsStats() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('valid_until, created_at, amount');

    if (error) throw error;

    const total = subscriptions.length;
    const active = subscriptions.filter(sub => 
      new Date(sub.valid_until) > now
    ).length;
    
    const expiring = subscriptions.filter(sub => {
      const validUntil = new Date(sub.valid_until);
      return validUntil > now && validUntil <= nextWeek;
    }).length;

    return { total, active, expiring };
  }

  // Fetch earnings and revenue data
  async function fetchEarningsStats() {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Current month earnings from seller_earnings
    const { data: currentEarnings, error: earningsError } = await supabase
      .from('seller_earnings')
      .select('total_amount, total_commission, payment_status')
      .ilike('month_year', `${currentMonth}%`);

    if (earningsError) throw earningsError;

    // Total revenue from all subscriptions
    const { data: allSubscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('amount');

    if (subscriptionsError) throw subscriptionsError;

    const currentMonth_earnings = currentEarnings.reduce((sum, earning) => 
      sum + parseFloat(earning.total_commission || 0), 0
    );

    const totalRevenue = allSubscriptions.reduce((sum, sub) => 
      sum + parseFloat(sub.amount || 0), 0
    );

    const pendingPayments = currentEarnings
      .filter(earning => earning.payment_status === 'pending')
      .reduce((sum, earning) => sum + parseFloat(earning.total_amount || 0), 0);

    return {
      currentMonth: Math.round(currentMonth_earnings),
      totalRevenue: Math.round(totalRevenue),
      pendingPayments: Math.round(pendingPayments)
    };
  }

  // Fetch gateway statistics
  async function fetchGatewaysStats() {
    const { data: gateways, error } = await supabase
      .from('gateways')
      .select('status, current_device_count, max_devices');

    if (error) throw error;

    const total = gateways.length;
    const active = gateways.filter(gateway => gateway.status === 'active').length;
    const maintenance = gateways.filter(gateway => gateway.status === 'maintenance').length;

    return { total, active, maintenance };
  }

  // Fetch monthly device growth data for the chart
  async function fetchMonthlyGrowth() {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group devices by month for the last 6 months
    const monthsData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = months[date.getMonth()];
      monthsData[monthKey] = { month: monthName, value: 0 };
    }

    // Count devices created each month
    devices.forEach(device => {
      const deviceDate = new Date(device.created_at);
      const monthKey = `${deviceDate.getFullYear()}-${String(deviceDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthsData[monthKey]) {
        monthsData[monthKey].value++;
      }
    });

    return Object.values(monthsData);
  }

  // Generate recent alerts based on actual data
  async function generateRecentAlerts() {
    const alerts = [];
    const now = new Date();

    try {
      // Get offline devices (not updated in last 5 minutes)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const { data: offlineDevices, error: offlineError } = await supabase
        .from('devices')
        .select('device_id, device_name, last_updated, gateway_id')
        .lt('last_updated', fiveMinutesAgo.toISOString())
        .limit(5);

      if (!offlineError && offlineDevices) {
        offlineDevices.forEach(device => {
          const timeDiff = Math.floor((now - new Date(device.last_updated)) / (1000 * 60));
          alerts.push({
            id: `${device.device_id}`,
            message: `Device offline for ${timeDiff} minutes`,
            time: `${timeDiff} minutes ago`,
            type: 'warning'
          });
        });
      }

      // Get expiring subscriptions (next 7 days)
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data: expiringSubscriptions, error: expiringError } = await supabase
        .from('subscriptions')
        .select('device_id, valid_until, plan_name')
        .gte('valid_until', now.toISOString())
        .lte('valid_until', nextWeek.toISOString())
        .limit(5);

      if (!expiringError && expiringSubscriptions) {
        expiringSubscriptions.forEach(subscription => {
          const daysLeft = Math.ceil((new Date(subscription.valid_until) - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `${subscription.device_id}`,
            message: `Subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            time: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`,
            type: 'info'
          });
        });
      }

      // Get devices with error status
      const { data: errorDevices, error: errorDevicesError } = await supabase
        .from('devices')
        .select('device_id, device_name, error_status')
        .neq('error_status', 0)
        .limit(3);

      if (!errorDevicesError && errorDevices) {
        errorDevices.forEach(device => {
          alerts.push({
            id: `${device.device_id}`,
            message: `Device error status: ${device.error_status}`,
            time: 'Active now',
            type: 'error'
          });
        });
      }

      // Sort alerts by severity and limit to 6 most recent
      const sortedAlerts = alerts
        .sort((a, b) => {
          const priority = { error: 3, warning: 2, info: 1 };
          return priority[b.type] - priority[a.type];
        })
        .slice(0, 6);

      return sortedAlerts;

    } catch (error) {
      console.error('Error generating alerts:', error);
      return [
        {
          id: 'SYSTEM',
          message: 'Unable to load current alerts',
          time: 'Now',
          type: 'warning'
        }
      ];
    }
  }

  // Fetch previous month data for growth comparison
  async function fetchPreviousMonthComparison() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    try {
      // Get device count from last month
      const { data: lastMonthDevices, error: devicesError } = await supabase
        .from('devices')
        .select('id')
        .lte('created_at', lastMonthEnd.toISOString());

      // Get seller count from last month
      const { data: lastMonthSellers, error: sellersError } = await supabase
        .from('seller_profiles')
        .select('id, is_approved')
        .lte('created_at', lastMonthEnd.toISOString());

      // Get last month earnings
      const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      const { data: lastMonthEarnings, error: earningsError } = await supabase
        .from('seller_earnings')
        .select('total_commission')
        .ilike('month_year', `${lastMonthKey}%`);

      const totalDevices = lastMonthDevices ? lastMonthDevices.length : 0;
      const activeMasters = lastMonthSellers ? lastMonthSellers.filter(s => s.is_approved).length : 0;
      const monthlyEarnings = lastMonthEarnings ? 
        lastMonthEarnings.reduce((sum, e) => sum + parseFloat(e.total_commission || 0), 0) : 0;

      // For online devices, we'll use a percentage of total devices as approximation
      const onlineDevices = Math.round(totalDevices * 0.8); // Assuming 80% online rate

      return {
        totalDevices,
        activeMasters,
        monthlyEarnings: Math.round(monthlyEarnings),
        onlineDevices
      };
    } catch (error) {
      console.error('Error fetching previous month data:', error);
      return {
        totalDevices: 0,
        activeMasters: 0,
        monthlyEarnings: 0,
        onlineDevices: 0
      };
    }
  }

  // Utility function to calculate growth percentage
  function calculateGrowthPercentage(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }