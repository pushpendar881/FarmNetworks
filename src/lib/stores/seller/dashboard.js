// $lib/stores/dashboard.js
import { writable, derived, readable, get } from 'svelte/store';
import { 
  getSellerEarnings, 
  getMonthlyBreakdown, 
  getSellerDashboardSummary,
  subscribeToEarningsUpdates,
  exportEarningsCSV
} from '../seller/earning.js';

// Debug logging helper
const debugLog = (message, data = null) => {
  console.log(`[Dashboard Store] ${message}`, data || '');
};

// Current seller ID - you can set this from your authentication
export const currentSellerId = writable(null);

// Selected month for filtering
export const selectedMonth = writable(new Date().toISOString().slice(0, 7));

// Loading states
export const isLoading = writable(false);
export const isExporting = writable(false);

// Error handling
export const error = writable(null);

// Role validation state
export const roleValidation = writable({
  isValid: false,
  userRole: null,
  message: ''
});

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

// Helper function to validate user role
async function validateUserRole(userId) {
  try {
    // You'll need to implement this function to check user role
    // This is a placeholder - replace with your actual role checking logic
    const response = await fetch(`/api/user/${userId}/role`);
    const data = await response.json();
    
    return {
      isValid: data.role === 'seller',
      userRole: data.role,
      hasSellerProfile: data.hasSellerProfile || false
    };
  } catch (error) {
    debugLog('Error validating user role:', error);
    return {
      isValid: false,
      userRole: null,
      hasSellerProfile: false
    };
  }
}

// Derived store for formatted earnings
export const formattedEarnings = derived(earnings, ($earnings) => {
  debugLog('Formatted earnings updated', $earnings);
  return {
    ...$earnings,
    thisMonthFormatted: `₹${$earnings.thisMonth.toLocaleString('en-IN')}`,
    totalRechargeAmountFormatted: `₹${$earnings.totalRechargeAmount.toLocaleString('en-IN')}`,
    totalSalesFormatted: `₹${$earnings.totalSales.toLocaleString('en-IN')}`
  };
});

// Derived store for chart data
export const chartData = derived(monthlyBreakdown, ($monthlyBreakdown) => {
  debugLog('Chart data updated', $monthlyBreakdown);
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
  // Validate user role before initializing
  async validateAndInit(sellerId) {
    debugLog('Validating user role for seller ID:', sellerId);
    
    if (!sellerId) {
      const errorMsg = 'Seller ID is required';
      debugLog('Error:', errorMsg);
      error.set(errorMsg);
      roleValidation.set({
        isValid: false,
        userRole: null,
        message: errorMsg
      });
      return false;
    }

    isLoading.set(true);
    error.set(null);

    try {
      const validation = await validateUserRole(sellerId);
      debugLog('Role validation result:', validation);
      
      roleValidation.set({
        isValid: validation.isValid,
        userRole: validation.userRole,
        message: validation.isValid 
          ? 'User role validated successfully' 
          : `Invalid role: ${validation.userRole || 'undefined'}. Expected 'seller'.`
      });

      if (!validation.isValid) {
        const errorMsg = validation.userRole 
          ? `Access denied. Your role is '${validation.userRole}', but 'seller' role is required.`
          : 'Access denied. No valid role found. Please contact support.';
        
        error.set(errorMsg);
        isLoading.set(false);
        return false;
      }

      // If validation passes, proceed with initialization
      await this.init(sellerId);
      return true;

    } catch (err) {
      debugLog('Error during role validation:', err);
      const errorMsg = 'Failed to validate user permissions. Please try again.';
      error.set(errorMsg);
      roleValidation.set({
        isValid: false,
        userRole: null,
        message: errorMsg
      });
      isLoading.set(false);
      return false;
    }
  },

  // Initialize earnings data (now called after role validation)
  async init(sellerId) {
    debugLog('Initializing with validated seller ID:', sellerId);

    // Clean up existing subscription
    if (realtimeSubscription) {
      debugLog('Cleaning up existing subscription');
      realtimeSubscription.unsubscribe();
      realtimeSubscription = null;
    }

    currentSellerId.set(sellerId);
    
    try {
      // Load all data in parallel with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      debugLog('Starting parallel data fetch...');
      const dataPromises = Promise.all([
        getSellerEarnings(sellerId).catch(err => {
          debugLog('getSellerEarnings failed:', err);
          // Return default data if earnings fetch fails
          return {
            thisMonth: 0,
            devicesRecharged: 0,
            totalRechargeAmount: 0,
            rechargeRate: 0,
            commissionRate: 5,
            recentTransactions: [],
            sellerRating: 0,
            totalSales: 0
          };
        }),
        getMonthlyBreakdown(sellerId).catch(err => {
          debugLog('getMonthlyBreakdown failed:', err);
          return [];
        }),
        getSellerDashboardSummary(sellerId).catch(err => {
          debugLog('getSellerDashboardSummary failed:', err);
          return {
            earningsGrowth: 0,
            totalDevicesManaged: 0,
            lastMonthEarnings: 0
          };
        })
      ]);

      const [earningsData, monthlyData, summaryData] = await Promise.race([
        dataPromises,
        timeoutPromise
      ]);

      debugLog('Data fetched successfully:', {
        earnings: earningsData,
        monthly: monthlyData,
        summary: summaryData
      });

      // Update stores
      earnings.set(earningsData);
      monthlyBreakdown.set(monthlyData);
      dashboardSummary.set(summaryData);

      debugLog('Stores updated, setting up real-time subscription');

      // Set up real-time updates with better error handling
      try {
        realtimeSubscription = subscribeToEarningsUpdates(sellerId, (updateData) => {
          debugLog('Real-time update received:', updateData);
          earningsActions.refresh();
        });
        debugLog('Real-time subscription established');
      } catch (subscriptionError) {
        debugLog('Failed to set up real-time subscription:', subscriptionError);
        // Don't fail the entire init if subscription fails
      }

    } catch (err) {
      debugLog('Error during initialization:', err);
      const errorMessage = err.message.includes('timeout') 
        ? 'Request timed out. Please try again.' 
        : `Failed to load earnings data: ${err.message}`;
      error.set(errorMessage);
    } finally {
      isLoading.set(false);
      debugLog('Loading state set to false');
    }
  },

  // Refresh earnings data
  async refresh() {
    const sellerId = get(currentSellerId);
    const month = get(selectedMonth);
    
    debugLog('Refreshing data for seller:', sellerId, 'month:', month);
    
    if (!sellerId) {
      const errorMsg = 'No seller selected';
      debugLog('Error:', errorMsg);
      error.set(errorMsg);
      return;
    }

    try {
      debugLog('Fetching fresh earnings data...');
      const earningsData = await getSellerEarnings(sellerId, month);
      debugLog('Fresh earnings data received:', earningsData);
      
      // Force update by creating new object
      earnings.set({ ...earningsData });
      debugLog('Earnings store updated');
      
    } catch (err) {
      debugLog('Error refreshing earnings:', err);
      error.set(`Failed to refresh earnings data: ${err.message}`);
    }
  },

  // Update selected month and refresh data
  async updateMonth(month) {
    debugLog('Updating month to:', month);
    
    if (!month) {
      const errorMsg = 'Invalid month selected';
      debugLog('Error:', errorMsg);
      error.set(errorMsg);
      return;
    }
    
    selectedMonth.set(month);
    const sellerId = get(currentSellerId);
    if (!sellerId) {
      const errorMsg = 'No seller selected';
      debugLog('Error:', errorMsg);
      error.set(errorMsg);
      return;
    }

    isLoading.set(true);
    error.set(null);
    debugLog('Loading month data...');

    try {
      const earningsData = await getSellerEarnings(sellerId, month);
      debugLog('Month data received:', earningsData);
      
      // Force update
      earnings.set({ ...earningsData });
      debugLog('Earnings updated for new month');
      
    } catch (err) {
      debugLog('Error updating month:', err);
      error.set(`Failed to update month data: ${err.message}`);
    } finally {
      isLoading.set(false);
      debugLog('Month update complete');
    }
  },

  // Manual trigger for testing
  async forceRefresh() {
    debugLog('Force refresh triggered');
    const sellerId = get(currentSellerId);
    if (sellerId) {
      await this.refresh();
    } else {
      debugLog('Cannot force refresh - no seller ID');
    }
  },

  async exportData() {
    const sellerId = get(currentSellerId);
    const month = get(selectedMonth);
    
    debugLog('Exporting data for seller:', sellerId, 'month:', month);
    
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
      
      debugLog('Data exported successfully');
      
    } catch (err) {
      debugLog('Error exporting data:', err);
      error.set('Failed to export data. Please try again.');
    } finally {
      isExporting.set(false);
    }
  },

  // Clear error
  clearError() {
    debugLog('Clearing error');
    error.set(null);
  },

  // Cleanup function
  cleanup() {
    debugLog('Cleaning up dashboard store');
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
      realtimeSubscription = null;
    }
    currentSellerId.set(null);
    error.set(null);
    roleValidation.set({
      isValid: false,
      userRole: null,
      message: ''
    });
  }
};

// Subscribe to changes for debugging
earnings.subscribe(value => {
  debugLog('Earnings store changed:', value);
});

error.subscribe(value => {
  if (value) {
    debugLog('Error occurred:', value);
  }
});

roleValidation.subscribe(value => {
  debugLog('Role validation changed:', value);
});

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
  roleValidation,
  actions: earningsActions
};