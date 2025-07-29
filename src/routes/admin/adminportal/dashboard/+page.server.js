// Admin Dashboard Data Loader
// TODO: Replace mock data with real DB queries (e.g., Supabase, Postgres)

export async function load() {
  // Mock data for demonstration
  const totalDevices = 1234;
  const activeMasters = 45;
  const monthlyEarnings = 2847;
  const onlineDevices = 987;
  const offlineDevices = 247;
  const monthlyGrowth = [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 80 },
    { month: 'Mar', value: 95 },
    { month: 'Apr', value: 110 },
    { month: 'May', value: 123 },
    { month: 'Jun', value: 140 }
  ];
  const recentAlerts = [
    { id: 'DEV-001 (MST-A1)', message: 'Device offline for 2 hours', time: '2 hours ago', type: 'warning' },
    { id: 'DEV-045 (MST-B3)', message: 'Recharge due in 3 days', time: '4 hours ago', type: 'info' },
    { id: 'DEV-089 (MST-C2)', message: 'Maintenance required', time: '6 hours ago', type: 'warning' },
    { id: 'DEV-156 (MST-A4)', message: 'Low battery alert', time: '8 hours ago', type: 'error' }
  ];

  return {
    totalDevices,
    activeMasters,
    monthlyEarnings,
    onlineDevices,
    offlineDevices,
    monthlyGrowth,
    recentAlerts
  };
} 