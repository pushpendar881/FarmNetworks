// $lib/seller/earning.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";
const supabase = createClient(supabaseUrl, supabaseKey);
export const PUBLIC_SUPABASE_URL = supabaseUrl;

/**
 * Get seller earnings data from Supabase - Updated for new schema
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
    
    // Get subscriptions for this seller in the specified month
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        devices (
          device_id,
          device_name,
          customer_name,
          customer_phone,
          customer_email
        )
      `)
      .eq('seller_id', sellerId)
      .eq('payment_status', 'completed')
      .gte('valid_from', startDate.toISOString())
      .lt('valid_from', endDate.toISOString())
      .order('valid_from', { ascending: false });
      
    console.log('Subscription query result:', { subscriptions, subscriptionsError });
    
    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      throw subscriptionsError;
    }
    
    // Calculate earnings metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => {
      const amount = parseFloat(sub?.commission_amount) || 0;
      return sum + amount;
    }, 0) || 0;
    
    console.log('This month earnings:', thisMonthEarnings);
    const devicesRecharged = subscriptions?.length || 0;
    
    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.amount) || 0), 0
    ) || 0;
    console.log('Total recharge amount:', totalRechargeAmount);
    
    // Get seller profile data
    const { data: sellerData } = await supabase
      .from('seller_profiles')
      .select('commission_rate, total_sales')
      .eq('id', sellerId)
      .maybeSingle();
    
      const calculatedCommission = (parseFloat(sub.amount) * commissionRate) / 100;
      const commission = parseFloat(sub.commission_amount) || calculatedCommission;
      const rechargeRate = devicesRecharged > 0 ? 100 : 0;
    
    // Format recent transactions
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => {
      const device = sub.devices || {};
      return {
        date: new Date(sub.valid_from).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        deviceId: device.device_id || 'N/A',
        deviceName: device.device_name || 'N/A',
        rechargeAmount: parseFloat(sub.amount) || 0,
        commission: parseFloat(sub.commission_amount) || 0,
        status: sub.payment_status === 'completed' ? 'Completed' : 'Pending',
        customerName: device.customer_name || 'Unknown',
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
 * Export seller earnings data as CSV - Updated for new schema
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM'
 * @returns {string} CSV content
 */
export async function getSellerEarnings(sellerId, month = null) {
  if (!sellerId || typeof sellerId !== 'string') {
    throw new Error('Valid seller ID is required');
  }
  
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Month must be in YYYY-MM format');
  }
    
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
    
    // Get subscriptions with device details
    const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      devices!subscriptions_device_id_fkey (
        device_id,
        device_name,
        customer_name,
        customer_phone,
        customer_email
      )
    `)
      .eq('seller_id', sellerId)
      .eq('payment_status', 'completed')
      .gte('valid_from', startDate.toISOString())
      .lt('valid_from', endDate.toISOString())
      .order('valid_from', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return 'Date,Device ID,Device Name,Customer Name,Customer Phone,Customer Email,Plan Name,Amount,Commission,Status\nNo data found for the selected period';
    }
    
    // Create CSV content
    // Update CSV header to match your data structure:
const csvHeader = 'Date,Transaction ID,Device ID,Device Name,Customer Name,Customer Phone,Customer Email,Plan Name,Plan Type,Amount,Commission,Status\n';
    const csvRows = subscriptions.map(sub => {
      const device = sub.devices || {};
      const date = new Date(sub.valid_from).toLocaleDateString('en-IN');
      const amount = parseFloat(sub.amount) || 0;
      const commission = parseFloat(sub.commission_amount) || 0;
      
      return [
        date,
        device.device_id || 'N/A',
        device.device_name || 'N/A',
        device.customer_name || 'Unknown',
        device.customer_phone || 'N/A',
        device.customer_email || 'N/A',
        sub.plan_name || 'Unknown Plan',
        amount.toFixed(2),
        commission.toFixed(2),
        sub.payment_status
      ].map(field => `"${field}"`).join(',');
    }).join('\n');
    
    return csvHeader + csvRows;
    
  } catch (error) {
    console.error('Error exporting earnings:', error);
    return `Error: ${error.message}`;
  }
}

/**
 * Get seller earnings summary for multiple months - Updated for new schema
 * @param {string} sellerId - UUID of the seller
 * @param {number} monthsBack - Number of months to look back
 * @returns {Array} Monthly breakdown data
 */
export async function getSellerEarningsSummary(sellerId, monthsBack = 6) {
  try {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    
    const monthlyBreakdown = [];
    const currentDate = new Date();
    
    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = targetDate.toISOString().slice(0, 7);
      const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01T00:00:00Z`;
      const endDate = `${year}-${(monthNum + 1).toString().padStart(2, '0')}-01T00:00:00Z`;
      // Get subscriptions for this month
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('amount, commission_amount')
        .eq('seller_id', sellerId)
        .eq('payment_status', 'completed')
        .gte('valid_from', startDate.toISOString())
        .lt('valid_from', endDate.toISOString());
      
      if (error) {
        console.warn(`Error fetching data for ${monthKey}:`, error);
        monthlyBreakdown.push({
          month: monthKey,
          earnings: 0,
          transactions: 0
        });
        continue;
      }
      
      const earnings = subscriptions?.reduce((sum, sub) => 
        sum + (parseFloat(sub.commission_amount) || 0), 0
      ) || 0;
      
      monthlyBreakdown.push({
        month: monthKey,
        earnings: Math.round(earnings),
        transactions: subscriptions?.length || 0
      });
    }
    
    return monthlyBreakdown.reverse(); // Return in chronological order
    
  } catch (error) {
    console.error('Error getting earnings summary:', error);
    throw error;
  }
}

/**
 * Get subscription distribution by plan type - Updated for new schema
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM'
 * @returns {Object} Distribution data
 */
export async function getSubscriptionDistribution(sellerId, month = null) {
  try {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
    
    // Get subscriptions grouped by plan type
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('plan_type, amount, commission_amount')
      .eq('seller_id', sellerId)
      .eq('payment_status', 'completed')
      .gte('valid_from', startDate.toISOString())
      .lt('valid_from', endDate.toISOString());
    
    if (error) {
      throw error;
    }
    
    // Group by plan type
    const distribution = {};
    subscriptions?.forEach(sub => {
      const planType = sub.plan_type || 'unknown';
      if (!distribution[planType]) {
        distribution[planType] = {
          count: 0,
          totalAmount: 0,
          totalCommission: 0
        };
      }
      distribution[planType].count++;
      distribution[planType].totalAmount += parseFloat(sub.amount) || 0;
      distribution[planType].totalCommission += parseFloat(sub.commission_amount) || 0;
    });
    
    // Convert to array format for charts
    const chartData = Object.entries(distribution).map(([planType, data]) => ({
      planType: planType.charAt(0).toUpperCase() + planType.slice(1),
      count: data.count,
      totalAmount: Math.round(data.totalAmount),
      totalCommission: Math.round(data.totalCommission)
    }));
    
    return {
      distribution,
      chartData
    };
    
  } catch (error) {
    console.error('Error getting subscription distribution:', error);
    throw error;
  }
}

// Event handlers for reactive updates
async function handleMonthChange() {
  // This would be called when the month selector changes
  // Implementation depends on your UI framework
}

async function loadChartData() {
  // This would load chart data for visualizations
  // Implementation depends on your charting library
}

function generateMonthOptions() {
  // Generate month options for the date picker
  const months = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push({
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    });
  }
  
  return months;
}