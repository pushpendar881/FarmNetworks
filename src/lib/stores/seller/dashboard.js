// $lib/stores/dashboard.js
import { writable, derived, readable } from 'svelte/store';
import { 
  getSellerEarnings, 
  getMonthlyBreakdown, 
  getSellerDashboardSummary,
  subscribeToEarningsUpdates,
  exportEarningsCSV
} from '../seller/earning.js';

// Current seller ID - you can set this from your authentication
export const currentSellerId = writable(null);

// Selected month for filtering
export const selectedMonth = writable(new Date().toISOString().slice(0, 7));

// Loading states
export const isLoading = writable(false);
export const isExporting = writable(false);

// Error handling
export const error = writable(null);

// Basic earnings data
export const earnings = writable({
  thisMonth: 0,
  devicesRecharged: 0,
  totalRechargeAmount: 0,
  rechargeRate: 0,
  commissionRate: 5,
  recentTransactions: [],
  sellerRating: 0,
  totalSales: 0
});

// Monthly breakdown data for charts
export const monthlyBreakdown = writable([]);

// Dashboard summary with additional metrics
export const dashboardSummary = writable({
  earningsGrowth: 0,
  totalDevicesManaged: 0,
  lastMonthEarnings: 0
});

// Derived store for formatted earnings
export const formattedEarnings = derived(earnings, ($earnings) => ({
  ...$earnings,
  thisMonthFormatted: `₹${$earnings.thisMonth.toLocaleString('en-IN')}`,
  totalRechargeAmountFormatted: `₹${$earnings.totalRechargeAmount.toLocaleString('en-IN')}`,
  totalSalesFormatted: `₹${$earnings.totalSales.toLocaleString('en-IN')}`
}));

// Derived store for chart data
export const chartData = derived(monthlyBreakdown, ($monthlyBreakdown) => 
  $monthlyBreakdown.map(item => ({
    name: item.month,
    earnings: item.earnings,
    transactions: item.transactions,
    height: $monthlyBreakdown.length > 0 
      ? (item.earnings / Math.max(...$monthlyBreakdown.map(i => i.earnings))) * 100 
      : 0
  }))
);

// Actions
export const earningsActions = {
  // Initialize earnings data
  async init(sellerId) {
    if (!sellerId) {
      error.set('Seller ID is required');
      return;
    }

    currentSellerId.set(sellerId);
    isLoading.set(true);
    error.set(null);

    try {
      // Load all data in parallel
      const [earningsData, monthlyData, summaryData] = await Promise.all([
        getSellerEarnings(sellerId),
        getMonthlyBreakdown(sellerId),
        getSellerDashboardSummary(sellerId)
      ]);

      earnings.set(earningsData);
      monthlyBreakdown.set(monthlyData);
      dashboardSummary.set(summaryData);

      // Set up real-time updates
      subscribeToEarningsUpdates(sellerId, () => {
        earningsActions.refresh();
      });

    } catch (err) {
      console.error('Error initializing earnings:', err);
      error.set('Failed to load earnings data');
    } finally {
      isLoading.set(false);
    }
  },

  // Refresh earnings data
  async refresh() {
    const sellerId = get(currentSellerId);
    if (!sellerId) return;

    try {
      const earningsData = await getSellerEarnings(sellerId, get(selectedMonth));
      earnings.set(earningsData);
    } catch (err) {
      console.error('Error refreshing earnings:', err);
      error.set('Failed to refresh earnings data');
    }
  },

  // Update selected month and refresh data
  async updateMonth(month) {
    selectedMonth.set(month);
    const sellerId = get(currentSellerId);
    if (!sellerId) return;

    isLoading.set(true);
    try {
      const earningsData = await getSellerEarnings(sellerId, month);
      earnings.set(earningsData);
    } catch (err) {
      console.error('Error updating month:', err);
      error.set('Failed to update month data');
    } finally {
      isLoading.set(false);
    }
  },

  // Export earnings data
  async exportData() {
    const sellerId = get(currentSellerId);
    const month = get(selectedMonth);
    
    if (!sellerId) {
      error.set('No seller selected');
      return;
    }

    isExporting.set(true);
    try {
      const csvContent = await exportEarningsCSV(sellerId, month);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings_report_${month || 'current'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error exporting data:', err);
      error.set('Failed to export data');
    } finally {
      isExporting.set(false);
    }
  },

  // Clear error
  clearError() {
    error.set(null);
  }
};

// Helper function to get store value (for use in functions)
function get(store) {
  let value;
  store.subscribe(v => value = v)();
  return value;
}

// Export individual stores and actions
export default {
  earnings,
  formattedEarnings,
  monthlyBreakdown,
  chartData,
  dashboardSummary,
  selectedMonth,
  isLoading,
  isExporting,
  error,
  currentSellerId,
  actions: earningsActions
};