// $lib/seller/earning.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";

// Create the Supabase client instance
const supabase = createClient(supabaseUrl, supabaseKey);

// Export the URL for use in other files
export const PUBLIC_SUPABASE_URL = supabaseUrl;

/**
 * Get seller earnings data dynamically from Supabase
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM' (optional, defaults to current month)
 * @returns {Object} Earnings data object
 */
export async function getSellerEarnings(sellerId, month = null) {
  try {
    // Validate sellerId
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    // Get current month if not provided
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${targetMonth}-01`;
    const endDate = new Date(targetMonth + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().slice(0, 10);

    // Fetch subscriptions sold by this seller for the target month
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        amount,
        commission_amount,
        recharge_date,
        payment_status,
        plan_name,
        user_id,
        user_profiles!inner(full_name),
        devices!inner(device_id, device_name)
      `)
      .eq('sold_by', sellerId)
      .eq('payment_status', 'completed')
      .gte('recharge_date', startDate)
      .lt('recharge_date', endDateStr)
      .order('recharge_date', { ascending: false });

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      throw subscriptionsError;
    }

    // Calculate earnings metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.commission_amount) || 0), 0
    ) || 0;

    const devicesRecharged = subscriptions?.length || 0;

    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + parseFloat(sub.amount), 0
    ) || 0;

    // Get seller's commission rate
    const { data: sellerData, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('commission_rate, total_sales, rating')
      .eq('id', sellerId)
      .single();

    if (sellerError) {
      console.error('Error fetching seller data:', sellerError);
      // Don't throw here, use default values instead
    }

    const commissionRate = parseFloat(sellerData?.commission_rate) || 5;
    
    // Calculate recharge rate (assuming 100% for completed transactions)
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;

    // Format recent transactions with better error handling
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => ({
      date: new Date(sub.recharge_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      deviceId: sub.devices?.[0]?.device_id || 'N/A',
      rechargeAmount: parseFloat(sub.amount) || 0,
      commission: parseFloat(sub.commission_amount) || 0,
      status: sub.payment_status === 'completed' ? 'Completed' : 'Pending',
      customerName: sub.user_profiles?.full_name || 'Unknown',
      planName: sub.plan_name || 'Unknown Plan'
    })) || [];

    return {
      thisMonth: Math.round(thisMonthEarnings),
      devicesRecharged,
      totalRechargeAmount: Math.round(totalRechargeAmount),
      rechargeRate,
      commissionRate,
      recentTransactions,
      sellerRating: parseFloat(sellerData?.rating) || 0,
      totalSales: parseFloat(sellerData?.total_sales) || 0
    };

  } catch (error) {
    console.error('Error in getSellerEarnings:', error);
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
  }
}

/**
 * Get monthly earnings breakdown for charts
 * @param {string} sellerId - UUID of the seller
 * @param {number} months - Number of previous months to fetch (default: 6)
 * @returns {Array} Array of monthly earnings data
 */
export async function getMonthlyBreakdown(sellerId, months = 6) {
  try {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const monthlyData = [];
    const currentDate = new Date();

    // Use Promise.all for better performance
    const monthPromises = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = targetDate.toISOString().slice(0, 7);
      monthPromises.push(
        getSellerEarnings(sellerId, month).then(earnings => ({
          month: targetDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          earnings: earnings.thisMonth,
          transactions: earnings.devicesRecharged,
          totalAmount: earnings.totalRechargeAmount
        }))
      );
    }

    const results = await Promise.all(monthPromises);
    return results;

  } catch (error) {
    console.error('Error in getMonthlyBreakdown:', error);
    return [];
  }
}

/**
 * Export earnings data to CSV format
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM'
 * @returns {string} CSV content
 */
export async function exportEarningsCSV(sellerId, month = null) {
  try {
    const earnings = await getSellerEarnings(sellerId, month);
    
    let csvContent = 'Date,Device ID,Customer Name,Plan Name,Recharge Amount,Commission,Status\n';
    
    earnings.recentTransactions.forEach(transaction => {
      // Escape commas in customer names and plan names
      const customerName = transaction.customerName.replace(/,/g, ';');
      const planName = transaction.planName.replace(/,/g, ';');
      
      csvContent += `${transaction.date},${transaction.deviceId},${customerName},${planName},₹${transaction.rechargeAmount},₹${transaction.commission},${transaction.status}\n`;
    });

    return csvContent;
  } catch (error) {
    console.error('Error in exportEarningsCSV:', error);
    return 'Error,Error,Error,Error,Error,Error,Error\n';
  }
}

/**
 * Get seller dashboard summary
 * @param {string} sellerId - UUID of the seller
 * @returns {Object} Dashboard summary data
 */
export async function getSellerDashboardSummary(sellerId) {
  try {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    // Get current month earnings
    const currentEarnings = await getSellerEarnings(sellerId);
    
    // Get previous month for comparison
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    const previousEarnings = await getSellerEarnings(sellerId, lastMonthStr);

    // Calculate growth percentage
    const earningsGrowth = previousEarnings.thisMonth > 0 
      ? ((currentEarnings.thisMonth - previousEarnings.thisMonth) / previousEarnings.thisMonth * 100).toFixed(1)
      : currentEarnings.thisMonth > 0 ? 100 : 0;

    // Get total devices managed by this seller
    const { data: totalDevices, error: devicesError } = await supabase
      .from('devices')
      .select('id', { count: 'exact' })
      .eq('seller_id', sellerId);

    if (devicesError) {
      console.error('Error fetching total devices:', devicesError);
    }

    return {
      ...currentEarnings,
      earningsGrowth: parseFloat(earningsGrowth),
      totalDevicesManaged: totalDevices?.length || 0,
      lastMonthEarnings: previousEarnings.thisMonth
    };

  } catch (error) {
    console.error('Error in getSellerDashboardSummary:', error);
    return {
      thisMonth: 0,
      devicesRecharged: 0,
      totalRechargeAmount: 0,
      rechargeRate: 0,
      commissionRate: 5,
      recentTransactions: [],
      sellerRating: 0,
      totalSales: 0,
      earningsGrowth: 0,
      totalDevicesManaged: 0,
      lastMonthEarnings: 0
    };
  }
}

/**
 * Real-time subscription listener for earnings updates
 * @param {string} sellerId - UUID of the seller
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} Supabase subscription object
 */
export function subscribeToEarningsUpdates(sellerId, callback) {
  if (!sellerId || typeof callback !== 'function') {
    console.error('Invalid parameters for subscribeToEarningsUpdates');
    return null;
  }

  return supabase
    .channel(`earnings-updates-${sellerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `sold_by=eq.${sellerId}`
      },
      (payload) => {
        console.log('Earnings update received:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });
}

// Export the supabase client for use in other modules if needed
export { supabase };