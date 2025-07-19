import { writable, derived } from 'svelte/store';
import { supabase } from '../supabase.js'; // Assuming you have supabase client setup

// Dashboard state
export const currentPage = writable('dashboard');
export const user = writable({
    name: '',
    initials: '',
    notifications: 0
});

// Loading states
export const loading = writable({
    masters: false,
    stats: false,
    earnings: false
});

export const error = writable({
    masters: null,
    stats: null,
    earnings: null
});

// Core data stores
export const masters = writable([]);
export const rawStats = writable({
    totalMasters: 0,
    totalDevices: 0,
    onlineDevices: 0,
    rechargedThisMonth: 0
});

// Derived stats with computed values
export const stats = derived(rawStats, ($rawStats) => {
    const { totalMasters, totalDevices, onlineDevices, rechargedThisMonth } = $rawStats;
    
    return {
        totalMasters,
        totalDevices,
        onlineDevices,
        rechargedThisMonth,
        uptimePercent: totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(1) : '0.0',
        rechargeRate: totalDevices > 0 ? Math.floor((rechargedThisMonth / totalDevices) * 100) : 0
    };
});

// Earnings data
export const earnings = writable({
    thisMonth: 0,
    devicesRecharged: 0,
    totalRechargeAmount: 0,
    rechargeRate: 0,
    totalEarnings: 0
});

// Utility function to get current user from auth
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Utility function to get current seller ID
async function getCurrentSellerId() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return null;

        // Check if user is a seller by looking at user_profiles
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (userProfile && userProfile.role === 'seller') {
            return currentUser.id;
        }

        return null;
    } catch (err) {
        console.error('Error getting current seller ID:', err);
        return null;
    }
}

// Function to load masters and devices data - Updated for new schema
export async function loadMastersData(sellerId = null) {
    loading.update(state => ({ ...state, masters: true }));
    error.update(state => ({ ...state, masters: null }));

    try {
        // First, get gateways with devices
        let gatewayQuery = supabase
            .from('gateways')
            .select(`
                id,
                name,
                status,
                latitude,
                longitude,
                max_devices,
               
                created_at
            `);
        

        // If sellerId is provided, filter by seller's gateways
        if (sellerId) {
            gatewayQuery = gatewayQuery.eq('seller_id', sellerId);
        }

        const { data: gatewaysData, error: gatewaysError } = await gatewayQuery;
        if (gatewaysError) {
            throw gatewaysError;
        }

        // Get devices for each gateway separately since there's no foreign key constraint
        const gatewaysWithDevices = await Promise.all(
            gatewaysData.map(async (gateway) => {
                const { data: devices, error: devicesError } = await supabase
                    .from('devices')
                    .select(`
                        id,
                        device_id,
                        device_name,
                        device_type,
                        motor_status,
                        error_status,
                        installation_date,
                        created_at,
                        last_updated
                    `)
                    .eq('gateway_id', gateway.id);
                
                if (devicesError) {
                    console.warn(`Error fetching devices for gateway ${gateway.id}:`, devicesError);
                    return { ...gateway, devices: [] };
                }
                
                return { ...gateway, devices: devices || [] };
            })
        );

        // Get all device IDs to fetch their subscriptions
        const allDeviceIds = new Set();
        gatewaysWithDevices.forEach(gateway => {
            gateway.devices.forEach(device => {
                if (device.device_id) {
                    allDeviceIds.add(device.device_id);
                }
            });
        });

        // Fetch subscriptions for all devices
        let subscriptionsData = [];
        if (allDeviceIds.size > 0) {
            const { data: subs, error: subsError } = await supabase
                .from('subscriptions')
                .select('*')
                .in('device_id', Array.from(allDeviceIds));
                
            if (subsError) {
                console.warn('Error fetching subscriptions:', subsError);
            } else {
                subscriptionsData = subs;
            }
        }

        // Create a map of device subscriptions for quick lookup
        const deviceSubscriptionsMap = {};
        subscriptionsData.forEach(sub => {
            if (!deviceSubscriptionsMap[sub.device_id]) {
                deviceSubscriptionsMap[sub.device_id] = [];
            }
            deviceSubscriptionsMap[sub.device_id].push(sub);
        });
        
        // Transform the data to match the expected format
        const transformedMasters = gatewaysWithDevices.map(gateway => ({
            id: gateway.name || `Gateway-${gateway.id.slice(0, 8)}`,
            location: gateway.latitude && gateway.longitude 
                ? `${gateway.latitude.toFixed(6)}, ${gateway.longitude.toFixed(6)}`
                : 'Coordinates not set',
            status: gateway.status === 'active' ? 'online' : 'offline',
            range: `${gateway.max_devices} devices max`,
            installed: new Date(gateway.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }),
            maxDevices: gateway.max_devices,
            // currentDeviceCount: gateway.current_device_count,
            nodes: gateway.devices.map(device => {
                // Get device's subscriptions using the renamed map
                // console.log(device)
                const deviceSubs = deviceSubscriptionsMap[device.device_id] || [];
                const latestSubscription = deviceSubs
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        
                return {
                    id: device.device_id,
                    name: device.device_name || device.device_id,
                    status: device.motor_status === 1 ? 'online' : 'offline',
                    lastActive: getTimeAgo(device.last_updated),
                    rechargeDate: latestSubscription 
                        ? new Date(latestSubscription.valid_from).toLocaleDateString('en-GB')
                        : 'Not recharged',
                    installDate: device.created_at 
                        ? new Date(device.created_at).toLocaleDateString('en-GB')
                        : 'Not set',
                    deviceType: device.device_type,
                    hasError: device.error_status !== 0,
                    customerName: device.customer_name || 'Unknown',
                    customerPhone: device.customer_phone || 'N/A',
                    customerEmail: device.customer_email || 'N/A',
                    subscription: latestSubscription
                };
            })
        }));

        masters.set(transformedMasters);
        return { success: true, data: transformedMasters };

    } catch (err) {
        console.error('Error loading masters data:', err);
        error.update(state => ({ ...state, masters: err.message }));
        return { success: false, error: err.message };
    } finally {
        loading.update(state => ({ ...state, masters: false }));
    }
}

// Function to load dashboard statistics - Updated for new schema
export async function loadDashboardStats(sellerId = null) {
    loading.update(state => ({ ...state, stats: true }));
    error.update(state => ({ ...state, stats: null }));

    try {
        // Get gateways count
        let gatewayQuery = supabase
            .from('gateways')
            .select('*', { count: 'exact', head: true });
            
        if (sellerId) {
            gatewayQuery = gatewayQuery.eq('seller_id', sellerId);
        }
        
        const { count: totalMasters, error: gatewayError } = await gatewayQuery;
        if (gatewayError) throw gatewayError;

        // Get devices count - devices are linked to gateways, not directly to sellers
        let deviceQuery = supabase
            .from('devices')
            .select('*', { count: 'exact', head: true });
            
        if (sellerId) {
            // Get seller's gateways first, then count devices in those gateways
            const { data: sellerGateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('seller_id', sellerId);
                
            if (sellerGateways && sellerGateways.length > 0) {
                const gatewayIds = sellerGateways.map(g => g.id);
                deviceQuery = deviceQuery.in('gateway_id', gatewayIds);
            } else {
                // No gateways found for seller, set count to 0
                const newStats = {
                    totalMasters: totalMasters || 0,
                    totalDevices: 0,
                    onlineDevices: 0,
                    rechargedThisMonth: 0
                };
                rawStats.set(newStats);
                return { success: true, data: newStats };
            }
        }
        
        const { count: totalDevices, error: deviceError } = await deviceQuery;
        if (deviceError) throw deviceError;

        // Get online devices count
        let onlineDeviceQuery = supabase
            .from('devices')
            .select('*', { count: 'exact', head: true })
            .eq('motor_status', 1);
            
        if (sellerId) {
            // Get seller's gateways first, then count online devices in those gateways
            const { data: sellerGateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('seller_id', sellerId);
                
            if (sellerGateways && sellerGateways.length > 0) {
                const gatewayIds = sellerGateways.map(g => g.id);
                onlineDeviceQuery = onlineDeviceQuery.in('gateway_id', gatewayIds);
            } else {
                // No gateways found for seller, set count to 0
                const newStats = {
                    totalMasters: totalMasters || 0,
                    totalDevices: totalDevices || 0,
                    onlineDevices: 0,
                    rechargedThisMonth: 0
                };
                rawStats.set(newStats);
                return { success: true, data: newStats };
            }
        }
        
        const { count: onlineDevices, error: onlineError } = await onlineDeviceQuery;
        if (onlineError) throw onlineError;

        // Get recharged devices this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        let rechargeQuery = supabase
            .from('subscriptions')
            .select('device_id', { count: 'exact', head: true })
            .gte('valid_from', startOfMonth.toISOString());
            
        if (sellerId) {
            // Get seller's gateways first, then get devices in those gateways
            const { data: sellerGateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('seller_id', sellerId);
                
            if (sellerGateways && sellerGateways.length > 0) {
                const gatewayIds = sellerGateways.map(g => g.id);
                const { data: sellerDevices } = await supabase
                    .from('devices')
                    .select('device_id')
                    .in('gateway_id', gatewayIds);
                    
                if (sellerDevices && sellerDevices.length > 0) {
                    const deviceIds = sellerDevices.map(d => d.device_id);
                    rechargeQuery = rechargeQuery.in('device_id', deviceIds);
                } else {
                    // No devices found for seller's gateways
                    const newStats = {
                        totalMasters: totalMasters || 0,
                        totalDevices: totalDevices || 0,
                        onlineDevices: onlineDevices || 0,
                        rechargedThisMonth: 0
                    };
                    rawStats.set(newStats);
                    return { success: true, data: newStats };
                }
            } else {
                // No gateways found for seller
                const newStats = {
                    totalMasters: totalMasters || 0,
                    totalDevices: totalDevices || 0,
                    onlineDevices: onlineDevices || 0,
                    rechargedThisMonth: 0
                };
                rawStats.set(newStats);
                return { success: true, data: newStats };
            }
        }
        
        const { count: rechargedThisMonth, error: rechargeError } = await rechargeQuery;
        if (rechargeError) throw rechargeError;

        const newStats = {
            totalMasters: totalMasters || 0,
            totalDevices: totalDevices || 0,
            onlineDevices: onlineDevices || 0,
            rechargedThisMonth: rechargedThisMonth || 0
        };

        rawStats.set(newStats);
        return { success: true, data: newStats };

    } catch (err) {
        console.error('Error loading dashboard stats:', err);
        error.update(state => ({ ...state, stats: err.message }));
        return { success: false, error: err.message };
    } finally {
        loading.update(state => ({ ...state, stats: false }));
    }
}

// Function to load earnings data - Updated for new schema
export async function loadEarningsData(sellerId) {
    if (!sellerId) {
        console.error('Seller ID is required for earnings data');
        return { success: false, error: 'Seller ID is required' };
    }

    loading.update(state => ({ ...state, earnings: true }));
    error.update(state => ({ ...state, earnings: null }));

    try {
        // Get current month's subscriptions for seller's devices
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        // First get seller's gateways
        const { data: sellerGateways } = await supabase
            .from('gateways')
            .select('id')
            .eq('seller_id', sellerId);
            
        if (!sellerGateways || sellerGateways.length === 0) {
            // No gateways found for seller
            const earningsData = {
                thisMonth: 0,
                devicesRecharged: 0,
                totalRechargeAmount: 0,
                rechargeRate: 0,
                totalEarnings: 0
            };
            earnings.set(earningsData);
            return { success: true, data: earningsData };
        }
        
        // Get devices in seller's gateways
        const gatewayIds = sellerGateways.map(g => g.id);
        const { data: sellerDevices } = await supabase
            .from('devices')
            .select('device_id')
            .in('gateway_id', gatewayIds);
            
        if (!sellerDevices || sellerDevices.length === 0) {
            // No devices found for seller's gateways
            const earningsData = {
                thisMonth: 0,
                devicesRecharged: 0,
                totalRechargeAmount: 0,
                rechargeRate: 0,
                totalEarnings: 0
            };
            earnings.set(earningsData);
            return { success: true, data: earningsData };
        }
        
        // Get subscriptions for seller's devices
        const deviceIds = sellerDevices.map(d => d.device_id);
        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('amount')
            .in('device_id', deviceIds)
            .gte('valid_from', startOfMonth.toISOString());
            
        if (subError) throw subError;

        // Calculate earnings (assuming 10% commission rate for now)
        const commissionRate = 10; // Default commission rate
        const thisMonth = subscriptions?.reduce((sum, sub) => 
            sum + (parseFloat(sub.amount) * commissionRate / 100), 0
        ) || 0;
        
        const devicesRecharged = subscriptions?.length || 0;
        const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
            sum + (parseFloat(sub.amount) || 0), 0
        ) || 0;

        // Get seller's total sales from seller_profiles
        const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('total_sales')
            .eq('id', sellerId)
            .single();

        const rechargeRate = devicesRecharged > 0 ? 100 : 0;

        const earningsData = {
            thisMonth: Math.round(thisMonth),
            devicesRecharged,
            totalRechargeAmount: Math.round(totalRechargeAmount),
            rechargeRate,
            totalEarnings: parseFloat(sellerProfile?.total_sales) || 0
        };

        earnings.set(earningsData);
        return { success: true, data: earningsData };

    } catch (err) {
        console.error('Error loading earnings data:', err);
        error.update(state => ({ ...state, earnings: err.message }));
        return { success: false, error: err.message };
    } finally {
        loading.update(state => ({ ...state, earnings: false }));
    }
}

// Function to load user profile - Updated for dual-table structure
export async function loadUserProfile() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        // Get user profile from user_profiles table
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (userError) throw userError;

        // If user is a seller, also get seller profile
        let combinedProfile = userProfile;
        if (userProfile.role === 'seller') {
            const { data: sellerProfile, error: sellerError } = await supabase
                .from('seller_profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (!sellerError && sellerProfile) {
                // Combine user_profile and seller_profile data
                combinedProfile = {
                    ...userProfile,
                    business_name: sellerProfile.business_name,
                    business_type: sellerProfile.business_type,
                    address: sellerProfile.address,
                    city: sellerProfile.city,
                    state: sellerProfile.state,
                    pincode: sellerProfile.pincode,
                    gstin: sellerProfile.gstin,
                    total_sales: sellerProfile.total_sales,
                    is_approved: sellerProfile.is_approved,
                    approved_at: sellerProfile.approved_at
                };
            }
        }

        user.update(state => ({
            ...state,
            name: combinedProfile.full_name,
            initials: getInitials(combinedProfile.full_name)
        }));

        return { success: true, profile: combinedProfile };

    } catch (err) {
        console.error('Error loading user profile:', err);
        return { success: false, error: err.message };
    }
}

// Utility functions
function getInitials(name) {
    if (!name) return '';
    return name.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getTimeAgo(dateString) {
    if (!dateString) return 'Never';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Initialize dashboard
export async function initializeDashboard(sellerId = null) {
    try {
        // If no sellerId provided, try to get it automatically
        if (!sellerId) {
            sellerId = await getCurrentSellerId();
        }

        await Promise.all([
            loadMastersData(sellerId),
            loadDashboardStats(sellerId),
            sellerId ? loadEarningsData(sellerId) : Promise.resolve(),
            loadUserProfile()
        ]);
        
        return { success: true };
    } catch (err) {
        console.error('Error initializing dashboard:', err);
        return { success: false, error: err.message };
    }
}

// Refresh dashboard data
export async function refreshDashboard(sellerId = null) {
    try {
        // If no sellerId provided, try to get it automatically
        if (!sellerId) {
            sellerId = await getCurrentSellerId();
        }

        await Promise.all([
            loadMastersData(sellerId),
            loadDashboardStats(sellerId),
            sellerId ? loadEarningsData(sellerId) : Promise.resolve()
        ]);
        
        return { success: true };
    } catch (err) {
        console.error('Error refreshing dashboard:', err);
        return { success: false, error: err.message };
    }
}