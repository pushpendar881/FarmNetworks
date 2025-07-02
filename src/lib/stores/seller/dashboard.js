// $lib/stores/seller/dashboard.js
import { writable, derived, get } from 'svelte/store';
import { 
  getSellerEarnings, 
  getSellerEarningsSummary,
  getSubscriptionDistribution,
  exportSellerEarnings
} from '../seller/earning.js';

// Core stores
export const currentSellerId = writable(null);
export const selectedMonth = writable(new Date().toISOString().slice(0, 7));
export const isLoading = writable(false);
export const isExporting = writable(false);
export const error = writable(null);

export const earnings = writable({
  thisMonth: 0,
  devicesRecharged: 0,
  totalRechargeAmount: 0,
  rechargeRate: 0,
  commissionRate: 5,
  recentTransactions: [],
  sellerRating: 0,
  totalSales: 0,
  subscriptions: []
});

export const monthlyBreakdown = writable([]);
export const dashboardSummary = writable({
  earningsGrowth: 0,
  totalDevicesManaged: 0,
  lastMonthEarnings: 0
});

// Real-time subscription reference
let realtimeSubscription = null;

// Derived stores
export const formattedEarnings = derived(earnings, ($earnings) => ({
  ...$earnings,
  thisMonthFormatted: `₹${$earnings.thisMonth.toLocaleString('en-IN')}`,
  totalRechargeAmountFormatted: `₹${$earnings.totalRechargeAmount.toLocaleString('en-IN')}`,
  totalSalesFormatted: `₹${$earnings.totalSales.toLocaleString('en-IN')}`
}));

export const chartData = derived(monthlyBreakdown, ($monthlyBreakdown) => {
  return $monthlyBreakdown.map(item => ({
    name: item.month,
    earnings: item.earnings,
    transactions: item.transactions,
    height: $monthlyBreakdown.length > 0 
      ? (item.earnings / Math.max(...$monthlyBreakdown.map(i => i.earnings))) * 100 
      : 0
  }));
});

// Actions
export const earningsActions = {
  // Initialize dashboard for a seller
  async init(sellerId) {
    if (!sellerId) {
      error.set('Seller ID is required');
      return;
    }
    currentSellerId.set(sellerId);
    isLoading.set(true);
    error.set(null);

    try {
      // Use the current selected month
      const month = get(selectedMonth);
      const earningsData = await getSellerEarnings(sellerId, month);
      earnings.set({ ...earningsData });
    } catch (err) {
      error.set(`Failed to load earnings data: ${err.message}`);
      earnings.set({
        thisMonth: 0,
        devicesRecharged: 0,
        totalRechargeAmount: 0,
        rechargeRate: 0,
        commissionRate: 5,
        recentTransactions: [],
        sellerRating: 0,
        totalSales: 0,
        subscriptions: []
      });
    } finally {
      isLoading.set(false);
    }
  },

  // Update selected month and fetch new earnings
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
      earnings.set({ ...earningsData });
    } catch (err) {
      error.set(`Failed to update month data: ${err.message}`);
    } finally {
      isLoading.set(false);
    }
  },

  // Export earnings data as CSV
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
      const csvContent = await exportSellerEarnings(sellerId, month);
      if (!csvContent || csvContent.startsWith('Error')) {
        throw new Error('Failed to generate CSV data');
      }
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
      error.set('Failed to export data. Please try again.');
    } finally {
      isExporting.set(false);
    }
  },

  clearError() {
    error.set(null);
  },

  cleanup() {
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