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

    // Method 1: Use the view we created (recommended)
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscription_details')
      .select('*')
      .eq('sold_by', sellerId)
      .eq('payment_status', 'completed')
      .gte('recharge_date', startDate)
      .lt('recharge_date', endDateStr)
      .order('recharge_date', { ascending: false });

    // console.log('Subscriptions data:', subscriptions);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      
      // Fallback method if view doesn't work
      return await getSellerEarningsFallback(sellerId, month);
    }

    // Calculate earnings metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.commission_amount) || 0), 0
    ) || 0;

    const devicesRecharged = subscriptions?.length || 0;

    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + parseFloat(sub.amount), 0
    ) || 0;

    // Get seller's commission rate - FIXED: Actually try different column names
    let sellerData = null;
    let sellerError = null;

    // According to your schema, seller_profiles uses 'id' as primary key
    // which references user_profiles(id), so we should use 'id'
    const { data: fetchedSellerData, error: fetchedSellerError } = await supabase
      .from('seller_profiles')
      .select('commission_rate, total_sales, rating')
      .eq('id', sellerId)
      .maybeSingle();

    if (fetchedSellerError) {
      console.error('Error fetching seller data:', fetchedSellerError);
      sellerError = fetchedSellerError;
    } else {
      sellerData = fetchedSellerData;
    }
    
    // If no seller data found, try to get sample data to understand structure
    if (!sellerData && !sellerError) {
      console.warn(`No seller profile found for ID: ${sellerId}`);
      console.log('Attempting to fetch sample seller profile to understand table structure...');
      
      const { data: sampleData, error: sampleError } = await supabase
        .from('seller_profiles')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleData) {
        console.log('Sample seller profile structure:', Object.keys(sampleData));
        console.log('Available seller IDs in sample:', sampleData.id);
      } else if (sampleError) {
        console.log('Error fetching sample:', sampleError);
      } else {
        console.log('No seller profiles found in table');
      }

      // Also check if the sellerId exists in user_profiles
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id, role, full_name')
        .eq('id', sellerId);
       

      if (userProfile) {
        console.log('User profile found:', userProfile);
        if (userProfile.role !== 'seller') {
          console.warn(`User ${sellerId} exists but role is '${userProfile.role}', not 'seller'`);
        }
      } else {
        console.log('User profile not found for ID:', sellerId);
        if (userError) console.log('User profile error:', userError);
      }
    }

    const commissionRate = parseFloat(sellerData?.commission_rate) || 5;
    
    // Calculate recharge rate (assuming 100% for completed transactions)
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;

    // Format recent transactions with better error handling
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => {
      // Get first device if available
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

    return {
      thisMonth: Math.round(thisMonthEarnings),
      devicesRecharged,
      totalRechargeAmount: Math.round(totalRechargeAmount),
      rechargeRate,
      commissionRate,
      recentTransactions,
      sellerRating: parseFloat(sellerData?.rating) || 0,
      totalSales: parseFloat(sellerData?.total_sales) || 0,
      // Add debug info
      _debug: {
        sellerDataFound: !!sellerData,
        sellerId: sellerId,
        subscriptionsCount: subscriptions?.length || 0,
        sellerError: sellerError?.message || null
      }
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
      totalSales: 0,
      _debug: {
        error: error.message,
        sellerId: sellerId
      }
    };
  }
}

/**
 * Fallback method using separate queries
 */
async function getSellerEarningsFallback(sellerId, month = null) {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${targetMonth}-01`;
    const endDate = new Date(targetMonth + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().slice(0, 10);

    // Get subscriptions with user profiles
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
        user_profiles!inner (
          full_name,
          email
        )
      `)
      .eq('sold_by', sellerId)
      .eq('payment_status', 'completed')
      .gte('recharge_date', startDate)
      .lt('recharge_date', endDateStr)
      .order('recharge_date', { ascending: false });

    if (subscriptionsError) throw subscriptionsError;

    // Get devices for these users
    const userIds = [...new Set(subscriptions.map(sub => sub.user_id))];
    let devicesMap = {};
    
    if (userIds.length > 0) {
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('user_id, device_id, device_name, device_type')
        .in('user_id', userIds);

      if (!devicesError && devices) {
        devicesMap = devices.reduce((acc, device) => {
          if (!acc[device.user_id]) acc[device.user_id] = [];
          acc[device.user_id].push(device);
          return acc;
        }, {});
      }
    }

    // Calculate metrics
    const thisMonthEarnings = subscriptions?.reduce((sum, sub) => 
      sum + (parseFloat(sub.commission_amount) || 0), 0
    ) || 0;

    const devicesRecharged = subscriptions?.length || 0;
    const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
      sum + parseFloat(sub.amount), 0
    ) || 0;

    // Try to get seller data with multiple possible column names
    let sellerData = null;
    const possibleQueries = [
      () => supabase
        .from('seller_profiles')
        .select('commission_rate, total_sales, rating')
        .eq('id', sellerId)
        .maybeSingle(),
      
      () => supabase
        .from('seller_profiles')
        .select('commission_rate, total_sales, rating')
        .eq('seller_id', sellerId)
        .maybeSingle(),
      
      () => supabase
        .from('seller_profiles')
        .select('commission_rate, total_sales, rating')
        .eq('user_id', sellerId)
        .maybeSingle(),
    ];

    for (const queryFn of possibleQueries) {
      const result = await queryFn();
      if (!result.error && result.data) {
        sellerData = result.data;
        break;
      }
    }

    const commissionRate = parseFloat(sellerData?.commission_rate) || 5;
    const rechargeRate = devicesRecharged > 0 ? 100 : 0;

    // Format transactions
    const recentTransactions = subscriptions?.slice(0, 10).map(sub => {
      const userDevices = devicesMap[sub.user_id] || [];
      const firstDevice = userDevices[0];
      
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
        customerName: sub.user_profiles?.full_name || 'Unknown',
        planName: sub.plan_name || 'Unknown Plan'
      };
    }) || [];

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
    console.error('Error in fallback method:', error);
    throw error;
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

    const currentDate = new Date();
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
    
    let csvContent = 'Date,Device ID,Device Name,Customer Name,Plan Name,Recharge Amount,Commission,Status\n';
    
    earnings.recentTransactions.forEach(transaction => {
      // Escape commas in names
      const customerName = (transaction.customerName || '').replace(/,/g, ';');
      const planName = (transaction.planName || '').replace(/,/g, ';');
      const deviceName = (transaction.deviceName || '').replace(/,/g, ';');
      
      csvContent += `${transaction.date},${transaction.deviceId},${deviceName},${customerName},${planName},₹${transaction.rechargeAmount},₹${transaction.commission},${transaction.status}\n`;
    });

    return csvContent;
  } catch (error) {
    console.error('Error in exportEarningsCSV:', error);
    return 'Error,Error,Error,Error,Error,Error,Error,Error\n';
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

    // Get total devices managed by this seller - try multiple possible column names
    let totalDevicesCount = 0;
    const possibleDeviceQueries = [
      () => supabase
        .from('devices')
        .select('id', { count: 'exact' })
        .eq('seller_id', sellerId),
      
      () => supabase
        .from('devices')
        .select('id', { count: 'exact' })
        .eq('sold_by', sellerId),
      
      () => supabase
        .from('devices')
        .select('id', { count: 'exact' })
        .eq('managed_by', sellerId),
    ];

    for (const queryFn of possibleDeviceQueries) {
      const { data, error } = await queryFn();
      if (!error && data) {
        totalDevicesCount = data.length;
        break;
      }
    }

    return {
      ...currentEarnings,
      earningsGrowth: parseFloat(earningsGrowth),
      totalDevicesManaged: totalDevicesCount,
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
 * Debug function to check seller profile table structure
 * @param {string} sellerId - UUID of the seller
 * @returns {Object} Debug information
 */
export async function debugSellerProfile(sellerId) {
  try {
    console.log('🔍 Debugging seller profile for:', sellerId);

    // 1. Check if table exists and get sample structure
    const { data: sampleProfile, error: sampleError } = await supabase
      .from('seller_profiles')
      .select('*')
      .limit(1);

    console.log('Sample profile structure:', sampleProfile);
    console.log('Sample profile error:', sampleError);

    if (sampleProfile && sampleProfile.length > 0) {
      console.log('Available columns:', Object.keys(sampleProfile[0]));

      // 2. Try to find the seller with different possible column names
      const possibleColumns = ['id', 'seller_id', 'user_id', 'uuid'];
      
      for (const column of possibleColumns) {
        if (sampleProfile[0].hasOwnProperty(column)) {
          console.log(`Trying to find seller using column: ${column}`);
          
          const { data: foundSeller, error: findError } = await supabase
            .from('seller_profiles')
            .select('*')
            .eq(column, sellerId)
            .maybeSingle();

          console.log(`Result for ${column}:`, foundSeller);
          console.log(`Error for ${column}:`, findError);

          if (foundSeller) {
            return {
              success: true,
              foundWithColumn: column,
              sellerData: foundSeller,
              availableColumns: Object.keys(sampleProfile[0])
            };
          }
        }
      }
    }

    // 3. Check all seller profiles to see if our ID exists anywhere
    const { data: allProfiles, error: allError } = await supabase
      .from('seller_profiles')
      .select('*');

    console.log('Total seller profiles:', allProfiles?.length);
    console.log('All profiles error:', allError);

    if (allProfiles) {
      const matchingProfile = allProfiles.find(profile => 
        Object.values(profile).includes(sellerId)
      );
      
      if (matchingProfile) {
        console.log('Found matching profile:', matchingProfile);
        return {
          success: true,
          foundInValues: true,
          sellerData: matchingProfile,
          availableColumns: Object.keys(matchingProfile)
        };
      }
    }

    return {
      success: false,
      message: 'Seller not found in any column',
      sampleStructure: sampleProfile?.[0] ? Object.keys(sampleProfile[0]) : null,
      totalProfiles: allProfiles?.length || 0
    };

  } catch (error) {
    console.error('Debug error:', error);
    return {
      success: false,
      error: error.message
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