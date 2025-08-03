
// src/lib/stores/admin/dashboard.js
import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// Loading states
export const isLoading = writable(false);
export const error = writable(null);

// Dashboard data stores
export const dashboardOverview = writable({
  totalDevices: 0,
  totalDevicesChange: '+0%',
  activeMasters: 0,
  activeMastersChange: '+0%',
  monthlyEarnings: 0,
  monthlyEarningsChange: '+0%',
  onlineDevices: 0,
  onlineDevicesChange: '+0%',
  offlineDevices: 0
});

export const monthlyGrowthData = writable([]);
export const recentAlerts = writable([]);
export const deviceStatusData = writable({
  online: 0,
  offline: 0
});

// Helper functions
const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getPreviousMonthYear = () => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthName = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short' });
};

// Dashboard overview fetch function
export const fetchDashboardOverview = async () => {
  try {
    isLoading.set(true);
    error.set(null);

    // Get total devices count and growth
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('id, created_at, last_updated');
    
    if (devicesError) throw devicesError;

    const totalDevices = devices.length;
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const devicesLastMonth = devices.filter(d => new Date(d.created_at) < lastMonth).length;
    const deviceGrowth = devicesLastMonth > 0 ? 
      Math.round((totalDevices - devicesLastMonth) / devicesLastMonth * 100) : 0;

    // Get active gateways (masters)
    const { data: gateways, error: gatewaysError } = await supabase
      .from('gateways')
      .select('id, status, created_at')
      .eq('status', 'active');
    
    if (gatewaysError) throw gatewaysError;

    const activeMasters = gateways.length;
    const gatewaysLastMonth = gateways.filter(g => new Date(g.created_at) < lastMonth).length;
    const gatewayGrowth = gatewaysLastMonth > 0 ? 
      Math.round((activeMasters - gatewaysLastMonth) / gatewaysLastMonth * 100) : 0;

    // Get monthly earnings
    const currentMonthYear = getCurrentMonthYear();
    const previousMonthYear = getPreviousMonthYear();

    const { data: currentEarnings, error: currentEarningsError } = await supabase
      .from('seller_earnings')
      .select('total_amount')
      .eq('month_year', currentMonthYear);

    const { data: previousEarnings, error: previousEarningsError } = await supabase
      .from('seller_earnings')
      .select('total_amount')
      .eq('month_year', previousMonthYear);

    if (currentEarningsError) throw currentEarningsError;
    if (previousEarningsError) throw previousEarningsError;

    const monthlyEarnings = currentEarnings.reduce((sum, earning) => 
      sum + parseFloat(earning.total_amount || 0), 0);
    const previousMonthEarnings = previousEarnings.reduce((sum, earning) => 
      sum + parseFloat(earning.total_amount || 0), 0);
    const earningsGrowth = previousMonthEarnings > 0 ? 
      Math.round((monthlyEarnings - previousMonthEarnings) / previousMonthEarnings * 100) : 0;

    // Get online/offline devices (devices updated in last 5 minutes are considered online)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const onlineDevices = devices.filter(d => 
      d.last_updated && new Date(d.last_updated) >= new Date(fiveMinutesAgo)
    ).length;
    const offlineDevices = totalDevices - onlineDevices;
    
    // Calculate online devices change (simplified - could be enhanced with historical data)
    const onlineDevicesGrowth = -2; // This would need more complex logic

    dashboardOverview.set({
      totalDevices,
      totalDevicesChange: deviceGrowth >= 0 ? `+${deviceGrowth}%` : `${deviceGrowth}%`,
      activeMasters,
      activeMastersChange: gatewayGrowth >= 0 ? `+${gatewayGrowth}%` : `${gatewayGrowth}%`,
      monthlyEarnings: Math.round(monthlyEarnings),
      monthlyEarningsChange: earningsGrowth >= 0 ? `+${earningsGrowth}%` : `${earningsGrowth}%`,
      onlineDevices,
      onlineDevicesChange: `${onlineDevicesGrowth}%`,
      offlineDevices
    });

    deviceStatusData.set({
      online: onlineDevices,
      offline: offlineDevices
    });

  } catch (err) {
    console.error('Error fetching dashboard overview:', err);
    error.set(err.message);
  } finally {
    isLoading.set(false);
  }
};

// Monthly growth data fetch function
export const fetchMonthlyGrowth = async () => {
  try {
    const monthlyData = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const { data: devicesInMonth, error } = await supabase
        .from('devices')
        .select('id')
        .gte('created_at', targetMonth.toISOString())
        .lt('created_at', nextMonth.toISOString());

      if (error) throw error;

      monthlyData.push({
        month: getMonthName(targetMonth),
        value: devicesInMonth.length
      });
    }

    monthlyGrowthData.set(monthlyData);

  } catch (err) {
    console.error('Error fetching monthly growth:', err);
    error.set(err.message);
  }
};

// Recent alerts fetch function
export const fetchRecentAlerts = async () => {
  try {
    const alerts = [];
    
    // Get offline devices (not updated in last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: offlineDevices, error: offlineError } = await supabase
      .from('devices')
      .select('device_id, device_name, last_updated')
      .lt('last_updated', twoHoursAgo)
      .order('last_updated', { ascending: false })
      .limit(5);

    if (offlineError) throw offlineError;

    // Process offline devices
    offlineDevices.forEach(device => {
      const hoursOffline = Math.floor((Date.now() - new Date(device.last_updated)) / (1000 * 60 * 60));
      alerts.push({
        id: device.device_id || `DEV-${device.device_name}`,
        message: `Device offline for ${hoursOffline} hours`,
        time: `${hoursOffline} hours ago`,
        type: 'offline'
      });
    });

    // Get devices with low battery/recharge needed (subscriptions expiring in 3 days)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiringSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        device_id,
        valid_until,
        devices!inner(device_id, device_name)
      `)
      .lte('valid_until', threeDaysFromNow)
      .gt('valid_until', new Date().toISOString())
      .order('valid_until', { ascending: true })
      .limit(3);

    if (subError) throw subError;

    // Process expiring subscriptions
    expiringSubscriptions.forEach(sub => {
      const daysLeft = Math.ceil((new Date(sub.valid_until) - Date.now()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: sub.device_id,
        message: `Recharge due in ${daysLeft} days`,
        time: `${daysLeft} days left`,
        type: 'recharge'
      });
    });

    recentAlerts.set(alerts.slice(0, 10)); // Limit to 10 alerts

  } catch (err) {
    console.error('Error fetching recent alerts:', err);
    error.set(err.message);
  }
};

// Fetch all dashboard data
export const fetchAllDashboardData = async () => {
  await Promise.all([
    fetchDashboardOverview(),
    fetchMonthlyGrowth(),
    fetchRecentAlerts()
  ]);
};

// Auto-refresh functionality
let refreshInterval = null;

export const startAutoRefresh = (intervalMs = 30000) => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(() => {
    fetchAllDashboardData();
  }, intervalMs);
};

export const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Derived stores for computed values
export const totalDeviceCount = derived(dashboardOverview, $overview => $overview.totalDevices);

export const deviceStatusPercentages = derived(deviceStatusData, $status => {
  const total = $status.online + $status.offline;
  if (total === 0) return { online: 0, offline: 0 };
  
  return {
    online: Math.round(($status.online / total) * 100),
    offline: Math.round(($status.offline / total) * 100)
  };
});

export const criticalAlerts = derived(recentAlerts, $alerts => 
  $alerts.filter(alert => alert.type === 'offline').length
);

// Real-time subscriptions (if you want live updates)
export const subscribeToDeviceUpdates = () => {
  const subscription = supabase
    .channel('device_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'devices' }, 
      (payload) => {
        console.log('Device update:', payload);
        // Refresh dashboard data when devices change
        fetchDashboardOverview();
        fetchRecentAlerts();
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

// Export for cleanup
export const cleanup = () => {
  stopAutoRefresh();
};