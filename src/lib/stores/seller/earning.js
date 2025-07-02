// $lib/seller/earning.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";
const supabase = createClient(supabaseUrl, supabaseKey);
export const PUBLIC_SUPABASE_URL = supabaseUrl;

/**
 * Get seller earnings data from Supabase
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM' (optional, defaults to current month)
 * @returns {Object} Earnings data object
 */
export async function getSellerEarnings(sellerId, month = null) {
  try {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    console.log('Getting earnings for seller:', sellerId, 'month:', targetMonth);
    
    // Create proper date range for the month
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
    
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    // First try to get subscriptions using the view
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscription_details')
      .select('*')
      .eq('sold_by', sellerId)
      .eq('payment_status', 'completed')
      .gte('recharge_date', startDate.toISOString().split('T')[0])
      .lt('recharge_date', endDate.toISOString().split('T')[0])
      .order('recharge_date', { ascending: false });
      
    console.log('Subscription query result:', { subscriptions, subscriptionsError });
    
    if (subscriptionsError) {
      console.log('Subscription details view failed, trying fallback');
      return await getSellerEarningsFallback(sellerId, month);
    }
    
    // Calculate earnings metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.commission_amount) || 0), 0
    ) || 0;
    
    const devicesRecharged = subscriptions?.length || 0;
    
    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.amount) || 0), 0
    ) || 0;
    
    // Get seller profile data
    const { data: sellerData } = await supabase
      .from('seller_profiles')
      .select('commission_rate, total_sales, rating')
      .eq('id', sellerId)
      .maybeSingle();
    
    const commissionRate = parseFloat(sellerData?.commission_rate) || 5;
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;
    
    // Format recent transactions
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => {
      const firstDevice = sub.devices && sub.devices.length > 0 ? sub.devices[0] : null;
      
      return {
        date: new Date(sub.recharge_date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        deviceId: firstDevice?.device_id || 'N/A',
        deviceName: firstDevice?.device_name || 'N/A',
        rechargeAmount: parseFloat(sub.amount) || 0,
        commission: parseFloat(sub.commission_amount) || 0,
        status: sub.payment_status === 'completed' ? 'Completed' : 'Pending',
        customerName: sub.full_name || 'Unknown',
        planName: sub.plan_name || 'Unknown Plan'
      };
    }) || [];
    
    const result = {
      thisMonth: Math.round(thisMonthEarnings),
      devicesRecharged,
      totalRechargeAmount: Math.round(totalRechargeAmount),
      rechargeRate,
      commissionRate,
      recentTransactions,
      subscriptions: subscriptions || []
    };
    
    console.log('Final earnings result:', result);
    return result;
    
  } catch (error) {
    console.error('Error in getSellerEarnings:', error);
    throw error;
  }
}

/**
 * Fallback method when subscription_details view is not available
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM'
 * @returns {Object} Earnings data object
 */
export async function getSellerEarningsFallback(sellerId, month = null) {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
    
    console.log('Using fallback method for seller:', sellerId);
    
    // Get subscriptions from main table
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        amount,
        plan_type,
        payment_status,
        created_at,
        customer_id,
        device_ids
      `)
      .eq('sold_by', sellerId)
      .eq('payment_status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (subError) {
      console.error('Fallback subscription query failed:', subError);
      throw subError;
    }
    
    // Get seller profile data
    const { data: sellerData } = await supabase
      .from('seller_profiles')
      .select('commission_rate, total_sales, rating')
      .eq('id', sellerId)
      .maybeSingle();
    
    const commissionRate = parseFloat(sellerData?.commission_rate) || 5;
    
    // Calculate earnings
    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.amount) || 0), 0
    ) || 0;
    
    const thisMonthEarnings = totalRechargeAmount * (commissionRate / 100);
    const devicesRecharged = subscriptions?.length || 0;
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;
    
    // Get customer details for recent transactions
    const customerIds = [...new Set(subscriptions?.map(sub => sub.customer_id).filter(Boolean))];
    const { data: customers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', customerIds);
    
    const customerMap = customers?.reduce((map, customer) => {
      map[customer.id] = customer.full_name;
      return map;
    }, {}) || {};
    
    // Format recent transactions
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => ({
      date: new Date(sub.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      deviceId: sub.device_ids?.[0] || 'N/A',
      deviceName: 'Device', // Would need device lookup for actual name
      rechargeAmount: parseFloat(sub.amount) || 0,
      commission: (parseFloat(sub.amount) || 0) * (commissionRate / 100),
      status: 'Completed',
      customerName: customerMap[sub.customer_id] || 'Unknown',
      planName: sub.plan_type?.replace('_', ' ').toUpperCase() || 'Unknown Plan'
    })) || [];
    
    const result = {
      thisMonth: Math.round(thisMonthEarnings),
      devicesRecharged,
      totalRechargeAmount: Math.round(totalRechargeAmount),
      rechargeRate,
      commissionRate,
      recentTransactions,
      subscriptions: subscriptions || []
    };
    
    console.log('Fallback earnings result:', result);
    return result;
    
  } catch (error) {
    console.error('Error in getSellerEarningsFallback:', error);
    
    // Return empty data structure if all else fails
    return {
      thisMonth: 0,
      devicesRecharged: 0,
      totalRechargeAmount: 0,
      rechargeRate: 0,
      commissionRate: 5,
      recentTransactions: [],
      subscriptions: []
    };
  }
}

/**
 * Export seller earnings data to CSV
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM'
 * @returns {string} CSV data
 */
export async function exportSellerEarnings(sellerId, month = null) {
  try {
    const earningsData = await getSellerEarnings(sellerId, month);
    
    if (!earningsData.recentTransactions.length) {
      throw new Error('No transactions found for the selected period');
    }
    
    // CSV headers
    const headers = [
      'Date',
      'Device ID',
      'Customer Name',
      'Plan Name',
      'Recharge Amount (₹)',
      'Commission (₹)',
      'Status'
    ];
    
    // Convert transactions to CSV rows
    const rows = earningsData.recentTransactions.map(transaction => [
      transaction.date,
      transaction.deviceId,
      transaction.customerName,
      transaction.planName,
      transaction.rechargeAmount,
      transaction.commission,
      transaction.status
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
    
  } catch (error) {
    console.error('Error exporting earnings:', error);
    throw error;
  }
}

/**
 * Get earnings summary for multiple months
 * @param {string} sellerId - UUID of the seller
 * @param {number} monthsBack - Number of months to go back (default: 6)
 * @returns {Array} Array of monthly earnings data
 */
export async function getSellerEarningsSummary(sellerId, monthsBack = 6) {
  try {
    const summaryPromises = [];
    const now = new Date();
    
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      summaryPromises.push(getSellerEarnings(sellerId, monthStr));
    }
    
    const results = await Promise.all(summaryPromises);
    
    return results.map((data, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return {
        month: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        monthValue: date.toISOString().slice(0, 7),
        earnings: data.thisMonth,
        devices: data.devicesRecharged,
        totalAmount: data.totalRechargeAmount
      };
    });
    
  } catch (error) {
    console.error('Error getting earnings summary:', error);
    throw error;
  }
}

/**
 * Get subscription plan distribution for chart
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM'
 * @returns {Object} Chart data object
 */
export async function getSubscriptionDistribution(sellerId, month = null) {
  try {
    const earningsData = await getSellerEarnings(sellerId, month);
    const subscriptions = earningsData.subscriptions;
    
    if (!subscriptions || subscriptions.length === 0) {
      return {
        labels: [],
        data: [],
        total: 0
      };
    }
    
    // Group by plan type
    const planStats = {};
    subscriptions.forEach(sub => {
      const planType = sub.plan_type || sub.plan_name || 'unknown';
      const normalizedPlan = planType.toLowerCase().replace(/[_\s]+/g, '_');
      planStats[normalizedPlan] = (planStats[normalizedPlan] || 0) + 1;
    });
    
    const total = Object.values(planStats).reduce((sum, count) => sum + count, 0);
    
    return {
      labels: Object.keys(planStats).map(key => 
        key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
      ),
      data: Object.values(planStats),
      percentages: Object.values(planStats).map(value => 
        ((value / total) * 100).toFixed(1)
      ),
      total
    };
    
  } catch (error) {
    console.error('Error getting subscription distribution:', error);
    return {
      labels: [],
      data: [],
      total: 0
    };
  }
}

async function handleMonthChange() {
    console.log('Month changed to:', selectedMonthValue);
    await earningsActions.updateMonth(selectedMonthValue);
    await loadChartData();
}

async function loadChartData() {
    console.log('Loading chart data for:', selectedMonthValue);
    // ...rest of your code
}

function generateMonthOptions() {
    const options = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = date.toISOString().slice(0, 7);
        const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        options.push({ value, label });
    }
    return options;
}