// $lib/stores/dashboard.js
import { writable, derived, readable, get } from 'svelte/store';
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

// Real-time subscription reference
let realtimeSubscription = null;

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

    // Clean up existing subscription
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
      realtimeSubscription = null;
    }

    currentSellerId.set(sellerId);
    isLoading.set(true);
    error.set(null);

    try {
      // Load all data in parallel with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const dataPromises = Promise.all([
        getSellerEarnings(sellerId),
        getMonthlyBreakdown(sellerId),
        getSellerDashboardSummary(sellerId)
      ]);

      const [earningsData, monthlyData, summaryData] = await Promise.race([
        dataPromises,
        timeoutPromise
      ]);

      earnings.set(earningsData);
      monthlyBreakdown.set(monthlyData);
      dashboardSummary.set(summaryData);

      // Set up real-time updates
      realtimeSubscription = subscribeToEarningsUpdates(sellerId, () => {
        console.log('Real-time update triggered');
        earningsActions.refresh();
      });

    } catch (err) {
      console.error('Error initializing earnings:', err);
      const errorMessage = err.message.includes('timeout') 
        ? 'Request timed out. Please try again.' 
        : 'Failed to load earnings data. Please check your connection.';
      error.set(errorMessage);
    } finally {
      isLoading.set(false);
    }
  },

  // Refresh earnings data
  async refresh() {
    const sellerId = get(currentSellerId);
    const month = get(selectedMonth);
    
    if (!sellerId) {
      error.set('No seller selected');
      return;
    }

    try {
      const earningsData = await getSellerEarnings(sellerId, month);
      earnings.set(earningsData);
    } catch (err) {
      console.error('Error refreshing earnings:', err);
      error.set('Failed to refresh earnings data');
    }
  },

  // Update selected month and refresh data
  async updateMonth(month) {
    if (!month) {
      error.set('Invalid month selected');
      return;
    }

    selectedMonth.set(month);
    const sellerId = get(currentSellerId);
    
    if (!sellerId) {
      error.set('No seller selected');
      return;
    }

    isLoading.set(true);
    error.set(null);

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
    error.set(null);

    try {
      const csvContent = await exportEarningsCSV(sellerId, month);
      
      // Validate CSV content
      if (!csvContent || csvContent.startsWith('Error')) {
        throw new Error('Failed to generate CSV data');
      }
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings_report_${month || 'current'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error exporting data:', err);
      error.set('Failed to export data. Please try again.');
    } finally {
      isExporting.set(false);
    }
  },

  // Clear error
  clearError() {
    error.set(null);
  },

  // Cleanup function
  cleanup() {
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
      realtimeSubscription = null;
    }
    currentSellerId.set(null);
    error.set(null);
  }
};

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