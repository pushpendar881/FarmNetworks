// $lib/seller/earning.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";
const supabase = createClient(supabaseUrl, supabaseKey);
export const PUBLIC_SUPABASE_URL = supabaseUrl;

/**
 * Get seller earnings data from Supabase - Updated for correct schema
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM' (optional, defaults to current month)
 * @returns {Object} Earnings data object
 */
export async function getSellerEarnings(sellerId, month = null) {
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const [year, monthNum] = targetMonth.split('-').map(Number);
      
      // Use local dates if your DB stores local times
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 1);
      
      console.log('Query date range:', startDate, 'to', endDate);
  
      const { data: subscriptions, error } = await supabase
                .from('subscription_details')
                .select('*')
                .eq('sold_by', sellerId)
                .eq('payment_status', 'completed')
                .gte('recharge_date', startDate.toISOString().split('T')[0])
                .lt('recharge_date', endDate.toISOString().split('T')[0]);
            
            if (error) throw error;
            
            console.log('Subscriptions:', subscriptions);
    
    
    // Calculate earnings metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => {
      // console.log(sub?.commission_amount/100);
      const amount = parseFloat(sub?.amount);
      return sum + (isNaN(amount) ? 0 : amount * sub?.commission_amount/100);
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
    
    const commissionRate = parseFloat(sellerData?.commission_rate) || 10;
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;
    
    // Format recent transactions
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => {
      console.log(sub);
      return {
        date: new Date(sub.valid_from).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        deviceId: sub.device_id || 'N/A',
        deviceName: sub.device_name || 'N/A',
        rechargeAmount: parseFloat(sub.amount) || 0,
        commission: parseFloat(sub.commission_amount) || 0,
        status: sub.payment_status === 'completed' ? 'Completed' : 'Pending',
        customerName: sub.customer_name || 'Unknown',
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
 * Get seller earnings summary for multiple months - Updated for correct schema
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
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const monthNum = targetDate.getMonth() + 1;
      
      // Create proper date range
      const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
      
      // Get subscriptions for this month
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('amount, commission_amount')
        .eq('seller_id', sellerId)  // Changed from seller_id to sold_by
        .eq('payment_status', 'completed')
        .gte('valid_from', startDate.toISOString())
        .lt('valid_from', endDate.toISOString());
      
      if (error) {
        console.warn(`Error fetching data for ${year}-${monthNum}:`, error);
        monthlyBreakdown.push({
          month: targetDate.toLocaleDateString('en-IN', { 
            month: 'short', 
            year: '2-digit' 
          }),
          fullMonth: targetDate.toLocaleDateString('en-IN', { 
            month: 'long', 
            year: 'numeric' 
          }),
          earnings: 0,
          transactions: 0,
          totalAmount: 0,
          successRate: 0
        });
        continue;
      }
      
      const earnings = subscriptions?.reduce((sum, sub) => 
        sum + (parseFloat(sub.commission_amount) || 0), 0
      ) || 0;
      
      const totalAmount = subscriptions?.reduce((sum, sub) => 
        sum + (parseFloat(sub.amount) || 0), 0
      ) || 0;
      
      monthlyBreakdown.push({
        month: targetDate.toLocaleDateString('en-IN', { 
          month: 'short', 
          year: '2-digit' 
        }),
        fullMonth: targetDate.toLocaleDateString('en-IN', { 
          month: 'long', 
          year: 'numeric' 
        }),
        earnings: Math.round(earnings),
        transactions: subscriptions?.length || 0,
        totalAmount: Math.round(totalAmount),
        successRate: subscriptions?.length > 0 ? 100 : 0
      });
    }
    
    return monthlyBreakdown;
    
  } catch (error) {
    console.error('Error getting earnings summary:', error);
    throw error;
  }
}

/**
 * Get subscription distribution by plan type - Updated for correct schema
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
      .eq('seller_id', sellerId)  // Changed from seller_id to sold_by
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
    
    // Convert to array format for charts - matching the expected format
    const chartData = Object.entries(distribution).map(([planType, data]) => ({
      name: planType.charAt(0).toUpperCase() + planType.slice(1).replace('_', ' '),
      value: data.count,
      percentage: subscriptions?.length > 0 ? ((data.count / subscriptions.length) * 100).toFixed(1) : '0',
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

/**
 * Export seller earnings data as CSV - Updated for correct schema
 * @param {string} sellerId - UUID of the seller
 * @param {string} month - Month in format 'YYYY-MM' (optional)
 * @returns {string} CSV content
 */
export async function exportSellerEarnings(sellerId, month = null) {
  try {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
    
    // Get detailed subscription data for export
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('seller_id', sellerId)  // Changed from seller_id to sold_by
      .eq('payment_status', 'completed')
      .gte('valid_from', startDate.toISOString())
      .lt('valid_until', endDate.toISOString())
      .order('valid_from', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Get seller profile for header info - Fixed: get from user_profiles joined with seller_profiles
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select(`
        business_name,
        user_profiles!seller_profiles_id_fkey (
          email,
          full_name,
          phone
        )
      `)
      .eq('id', sellerId)
      .single();
    
    const userProfile = sellerProfile?.user_profiles || {};
    
    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Device ID',
      'Device Name',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Plan Name',
      'Plan Type',
      'Recharge Amount (₹)',
      'Commission Amount (₹)',
      'Payment Status',
      'Valid From',
      'Valid Until'
    ];
    
    const csvRows = subscriptions?.map(sub => {
      return [
        new Date(sub.valid_from).toLocaleDateString('en-IN'),
        sub.device_id || 'N/A',
        sub.device_name || 'N/A',
        sub.customer_name || 'Unknown',
        sub.customer_phone || 'N/A',
        sub.customer_email || 'N/A',
        sub.plan_name || 'Unknown Plan',
        sub.plan_type || 'Unknown',
        parseFloat(sub.amount) || 0,
        parseFloat(sub.commission_amount) || 0,
        sub.payment_status || 'Unknown',
        new Date(sub.valid_from).toLocaleDateString('en-IN'),
        new Date(sub.valid_until).toLocaleDateString('en-IN')
      ];
    }) || [];
    
    // Calculate summary
    const totalEarnings = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.commission_amount) || 0), 0
    ) || 0;
    
    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.amount) || 0), 0
    ) || 0;
    
    // Create CSV content
    let csvContent = csvHeaders.join(',') + '\n';
    csvContent += csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Add summary at the end
    csvContent += '\n\nSummary\n';
    csvContent += `Total Transactions,${subscriptions?.length || 0}\n`;
    csvContent += `Total Recharge Amount (₹),${totalRechargeAmount}\n`;
    csvContent += `Total Commission Earned (₹),${totalEarnings}\n`;
    csvContent += `Business Name,${sellerProfile?.business_name || 'N/A'}\n`;
    csvContent += `Seller Name,${userProfile?.full_name || 'N/A'}\n`;
    csvContent += `Seller Email,${userProfile?.email || 'N/A'}\n`;
    csvContent += `Seller Phone,${userProfile?.phone || 'N/A'}\n`;
    csvContent += `Report Period,${targetMonth}\n`;
    csvContent += `Generated On,${new Date().toLocaleDateString('en-IN')}\n`;
    
    return csvContent;
    
  } catch (error) {
    console.error('Error exporting seller earnings:', error);
    return `Error: ${error.message}`;
  }
}

/**
 * Generate month options for date picker
 * @returns {Array} Array of month options
 */
export function generateMonthOptions() {
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