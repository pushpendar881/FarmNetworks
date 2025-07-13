// $lib/seller/earning.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
// const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";

const supabaseUrl = "https://agkfjnktjvyxccfeamtf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2Zqbmt0anZ5eGNjZmVhbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTY3MTAsImV4cCI6MjA2Nzg3MjcxMH0.vEa3uvjJVZ0Vm8DbYMUS2BVvkpi0bNj2LVi-N0R1RtQ";

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
      
      // console.log('Query date range:', startDate, 'to', endDate);
  
      // const { data: subscriptions, error } = await supabase
      //           .from('subscriptions')
      //           .select('*')
      //           .eq('seller_id', sellerId)
      //           .eq('payment_status', 'completed')
      //           .gte('valid_from', startDate.toISOString().split('T')[0])
      //           .lt('valid_from', endDate.toISOString().split('T')[0]);
            
      //       if (error) throw error;
            
      //       console.log('Subscriptions:', subscriptions);

      console.log('Start date:', startDate.toISOString().split('T')[0], 'End date:', endDate.toISOString().split('T')[0]);
      
      // First get seller's gateways
      const { data: sellerGateways } = await supabase
          .from('gateways')
          .select('id')
          .eq('seller_id', sellerId);
          
      if (!sellerGateways || sellerGateways.length === 0) {
          return {
              thisMonth: 0,
              devicesRecharged: 0,
              totalRechargeAmount: 0,
              rechargeRate: 0,
              commissionRate: 0,
              recentTransactions: [],
              subscriptions: []
          };
      }
      
      // Get devices in seller's gateways
      const gatewayIds = sellerGateways.map(g => g.id).filter(Boolean);
      console.log('gatewayIds', gatewayIds);
      if (!gatewayIds.length) {
          return {
              thisMonth: 0,
              devicesRecharged: 0,
              totalRechargeAmount: 0,
              rechargeRate: 0,
              commissionRate: 0,
              recentTransactions: [],
              subscriptions: []
          };
      }
      // const { data: sellerDevices } = await supabase
      //     .from('devices')
      //     .select('device_id, device_name, customer_name, customer_phone, customer_email, gateway_id')
      //     .in('gateway_id', gatewayIds);
      
console.log('=== DEBUG GATEWAY IDS ===');
console.log('sellerGateways:', sellerGateways);
console.log('gatewayIds:', gatewayIds);
console.log('gatewayIds length:', gatewayIds.length);
console.log('gatewayIds types:', gatewayIds.map(id => typeof id));

// Validate and clean the gateway IDs
const validGatewayIds = gatewayIds.filter(id => {
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return id && typeof id === 'string' && uuidRegex.test(id);
});

console.log('validGatewayIds:', validGatewayIds);

if (validGatewayIds.length === 0) {
  console.error('No valid gateway IDs found');
  return {
    thisMonth: 0,
    devicesRecharged: 0,
    totalRechargeAmount: 0,
    rechargeRate: 0,
    commissionRate: 0,
    recentTransactions: [],
    subscriptions: []
  };
}

  const { data: sellerDevices, error: devicesError } = await supabase
  .from('devices')
  .select('device_id, device_name, gateway_id')
  .in('gateway_id', validGatewayIds);

console.log('=== DEVICES QUERY RESULT ===');
console.log('devicesError:', devicesError);
console.log('sellerDevices:', sellerDevices);

if (devicesError) {
  console.error('Error fetching devices:', devicesError);
  throw devicesError;
}
          
      if (!sellerDevices || sellerDevices.length === 0) {
          return {
              thisMonth: 0,
              devicesRecharged: 0,
              totalRechargeAmount: 0,
              rechargeRate: 0,
              commissionRate: 0,
              recentTransactions: [],
              subscriptions: []
          };
      }
      
      // Get subscriptions for seller's devices
      const deviceIds = sellerDevices.map(d => d.device_id).filter(Boolean);
      console.log('deviceIds', deviceIds);
      if (!deviceIds.length) {
          return {
              thisMonth: 0,
              devicesRecharged: 0,
              totalRechargeAmount: 0,
              rechargeRate: 0,
              commissionRate: 0,
              recentTransactions: [],
              subscriptions: []
          };
      }
      const { data: subscriptions, error } = await supabase
          .from('subscriptions')
          .select('*')
          .in('device_id', deviceIds)
          .gte('valid_from', startDate.toISOString().split('T')[0])
          .lt('valid_from', endDate.toISOString().split('T')[0]);
    
          console.log('Subscriptions:', subscriptions);
    // Get commission rate from commissions table
    const { data: commissionData } = await supabase
      .from('commissions')
      .select('rate')
      .eq('is_active', true)
      .maybeSingle();
    console.log(commissionData)
    const commissionRate = parseFloat(commissionData?.rate) || 10;
    console.log(commissionRate)
    // Calculate earnings metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => {
      const amount = parseFloat(sub?.amount);
      return sum + (isNaN(amount) ? 0 : amount * commissionRate / 100);
    }, 0) || 0;

    
    console.log('This month earnings:', thisMonthEarnings);
    const devicesRecharged = subscriptions?.length || 0;
    
    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.amount) || 0), 0
    ) || 0;
    console.log('Total recharge amount:', totalRechargeAmount);
    
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;
    
    // Create a map of device data for quick lookup
    const deviceMap = {};
    sellerDevices.forEach(device => {
      deviceMap[device.device_id] = device;
    });
    
    // Format recent transactions
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => {
      const deviceData = deviceMap[sub.device_id] || {};
      console.log(sub);
      return {
        date: new Date(sub.valid_from).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        deviceId: sub.device_id || 'N/A',
        deviceName: deviceData.device_name || 'N/A',
        rechargeAmount: parseFloat(sub.amount) || 0,
        commission: parseFloat(sub.commission_amount) || 0,
        status: sub.payment_status === 'completed' ? 'Completed' : 'Pending',
        customerName:  'Unknown',
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
      
      // Get seller's gateways first
      const { data: sellerGateways } = await supabase
        .from('gateways')
        .select('id')
        .eq('seller_id', sellerId);
        
      if (!sellerGateways || sellerGateways.length === 0) {
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
      
      // Get devices in seller's gateways
      const gatewayIds = sellerGateways.map(g => g.id);
      const { data: sellerDevices } = await supabase
        .from('devices')
        .select('device_id')
        .in('gateway_id', gatewayIds);
        
      if (!sellerDevices || sellerDevices.length === 0) {
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
      
      // Get subscriptions for seller's devices
      const deviceIds = sellerDevices.map(d => d.device_id);
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('amount, commission_amount')
        .in('device_id', deviceIds)
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
    
    // Get seller's gateways first
    const { data: sellerGateways } = await supabase
      .from('gateways')
      .select('id')
      .eq('seller_id', sellerId);
      
    if (!sellerGateways || sellerGateways.length === 0) {
      return {
        distribution: {},
        chartData: []
      };
    }
    
    // Get devices in seller's gateways
    const gatewayIds = sellerGateways.map(g => g.id);
    const { data: sellerDevices } = await supabase
      .from('devices')
      .select('device_id')
      .in('gateway_id', gatewayIds);
      
    if (!sellerDevices || sellerDevices.length === 0) {
      return {
        distribution: {},
        chartData: []
      };
    }
    
    // Get subscriptions grouped by plan type
    const deviceIds = sellerDevices.map(d => d.device_id);
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('plan_type, amount, commission_amount')
      .in('device_id', deviceIds)
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
    
    // Get seller's gateways first
    const { data: sellerGateways } = await supabase
      .from('gateways')
      .select('id')
      .eq('seller_id', sellerId);
      
    if (!sellerGateways || sellerGateways.length === 0) {
      return 'No data available for export';
    }
    
    // Get devices in seller's gateways
    const gatewayIds = sellerGateways.map(g => g.id);
    const { data: sellerDevices } = await supabase
      .from('devices')
      .select('device_id, device_name,gateway_id')
      .in('gateway_id', gatewayIds);
      
    if (!sellerDevices || sellerDevices.length === 0) {
      return 'No data available for export';
    }
    
    // Get detailed subscription data for export
    const deviceIds = sellerDevices.map(d => d.device_id);
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('device_id', deviceIds)
      .eq('payment_status', 'completed')
      .gte('valid_from', startDate.toISOString())
      .lt('valid_until', endDate.toISOString())
      .order('valid_from', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Get seller profile for header info
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('business_name')
      .eq('id', sellerId)
      .single();
      
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name, phone')
      .eq('id', sellerId)
      .single();
    
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
    
    // Create a map of device data for quick lookup
    const deviceMap = {};
    sellerDevices.forEach(device => {
      deviceMap[device.device_id] = device;
    });
    
    const csvRows = subscriptions?.map(sub => {
      const deviceData = deviceMap[sub.device_id] || {};
      return [
        new Date(sub.valid_from).toLocaleDateString('en-IN'),
        sub.device_id || 'N/A',
        deviceData.device_name || 'N/A',
        'Unknown',
        'N/A',
         'N/A',
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