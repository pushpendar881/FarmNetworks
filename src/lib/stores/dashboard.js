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

// Function to load masters and devices data
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
                address,
                latitude,
                longitude,
                coverage_radius,
                max_devices,
                current_device_count,
                created_at,
                devices!devices_gateway_id_fkey (
                    id,
                    device_id,
                    device_name,
                    device_type,
                    motor_status,
                    error_status,
                    installation_date,
                    warranty_until,
                    last_updated,
                    latitude,
                    longitude,
                    address,
                    user_id
                )
            `);
        

        // If sellerId is provided, filter by seller's gateways
        if (sellerId) {
            gatewayQuery = gatewayQuery.eq('owned_by', sellerId);
        }

        const { data: gatewaysData, error: gatewaysError } = await gatewayQuery;
        console.log(gatewaysData)
        if (gatewaysError) {
            throw gatewaysError;
        }

        // Get all user IDs from devices to fetch their subscriptions
        const allUserIds = new Set();
        gatewaysData.forEach(gateway => {
            gateway.devices.forEach(device => {
                if (device.user_id) {
                    allUserIds.add(device.user_id);
                }
            });
        });
        console.log(allUserIds)

        // Fetch subscriptions for all users
        let subscriptionsData = [];
        if (allUserIds.size > 0) {
            const { data: subs, error: subsError } = await supabase
                .from('subscriptions')
                .select('*')
                .in('user_id', Array.from(allUserIds));
                
            console.log(subs)
            if (subsError) {
                console.warn('Error fetching subscriptions:', subsError);
            } else {
                subscriptionsData = subs ;
            }
        }

        // Create a map of user subscriptions for quick lookup
        const userSubscriptions = {};
        subscriptionsData.forEach(sub => {
            if (!userSubscriptions[sub.user_id]) {
                userSubscriptions[sub.user_id] = [];
            }
            userSubscriptions[sub.user_id].push(sub);
        });

        // Transform the data to match the expected format
        const transformedMasters = gatewaysData.map(gateway => ({
            id: gateway.name || `Gateway-${gateway.id.slice(0, 8)}`,
            location: gateway.address || 'Location not set',
            status: gateway.status === 'active' ? 'online' : 'offline',
            range: `${(gateway.coverage_radius / 1000).toFixed(1)}km radius`,
            installed: new Date(gateway.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }),
            maxDevices: gateway.max_devices,
            currentDeviceCount: gateway.current_device_count,
            nodes: gateway.devices.map(device => {
                // Get user's subscriptions
                const deviceSubscriptions = userSubscriptions[device.user_id] || [];
                const latestSubscription = deviceSubscriptions
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

                return {
                    id: device.device_id,
                    name: device.device_name || device.device_id,
                    status: device.motor_status === 1 ? 'online' : 'offline',
                    lastActive: getTimeAgo(device.last_updated),
                    rechargeDate: latestSubscription 
                        ? new Date(latestSubscription.recharge_date).toLocaleDateString('en-GB')
                        : 'Not recharged',
                    expiryDate: latestSubscription 
                        ? new Date(latestSubscription.valid_until).toLocaleDateString('en-GB')
                        : 'No active plan',
                    installDate: device.installation_date 
                        ? new Date(device.installation_date).toLocaleDateString('en-GB')
                        : 'Not set',
                    deviceType: device.device_type,
                    hasError: device.error_status !== 0,
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

// Function to load dashboard statistics
export async function loadDashboardStats(sellerId = null) {
    loading.update(state => ({ ...state, stats: true }));
    error.update(state => ({ ...state, stats: null }));

    try {
        let gatewayQuery = supabase
            .from('gateways')
            .select('id, current_device_count, status');

        let deviceQuery = supabase
            .from('devices')
            .select('id, motor_status, gateway_id');

        // If sellerId is provided, filter by seller's data
        if (sellerId) {
            gatewayQuery = gatewayQuery.eq('owned_by', sellerId);
            
            // Get seller's gateway IDs first
            const { data: sellerGateways } = await supabase
                .from('gateways')
                .select('id')
                .eq('owned_by', sellerId);
            
            if (sellerGateways && sellerGateways.length > 0) {
                const gatewayIds = sellerGateways.map(g => g.id);
                deviceQuery = deviceQuery.in('gateway_id', gatewayIds);
            }
        }

        const [gatewaysResult, devicesResult] = await Promise.all([
            gatewayQuery,
            deviceQuery
        ]);

        if (gatewaysResult.error) throw gatewaysResult.error;
        if (devicesResult.error) throw devicesResult.error;

        const gateways = gatewaysResult.data || [];
        const devices = devicesResult.data || [];

        // Calculate statistics
        const totalMasters = gateways.length;
        const totalDevices = devices.length;
        const onlineDevices = devices.filter(device => device.motor_status === 1).length;

        // Get recharge statistics for this month
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        let rechargeQuery = supabase
            .from('subscriptions')
            .select('user_id')
            .eq('payment_status', 'completed')
            .gte('recharge_date', startOfMonth.toISOString());

        if (sellerId) {
            rechargeQuery = rechargeQuery.eq('sold_by', sellerId);
        }

        const { data: rechargesThisMonth, error: rechargeError } = await rechargeQuery;
        
        if (rechargeError) throw rechargeError;

        const rechargedThisMonth = rechargesThisMonth ? rechargesThisMonth.length : 0;

        // Update the stats store
        rawStats.set({
            totalMasters,
            totalDevices,
            onlineDevices,
            rechargedThisMonth
        });

        return { success: true };

    } catch (err) {
        console.error('Error loading dashboard stats:', err);
        error.update(state => ({ ...state, stats: err.message }));
        return { success: false, error: err.message };
    } finally {
        loading.update(state => ({ ...state, stats: false }));
    }
}

// Function to load earnings data for sellers
export async function loadEarningsData(sellerId) {
    if (!sellerId) return { success: false, error: 'Seller ID required' };

    loading.update(state => ({ ...state, earnings: true }));
    error.update(state => ({ ...state, earnings: null }));

    try {
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        // Get subscriptions sold by this seller
        const { data: subscriptions, error: subscriptionsError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('sold_by', sellerId)
            .eq('payment_status', 'completed');

        if (subscriptionsError) throw subscriptionsError;

        // Calculate earnings metrics
        const thisMonthSubs = subscriptions.filter(sub => 
            new Date(sub.recharge_date) >= startOfMonth
        );
        console.log(thisMonthSubs)
        const thisMonthEarnings = thisMonthSubs.reduce((sum, sub) => 
            sum + (sub.commission_amount || 0), 0
        );

        const totalEarnings = subscriptions.reduce((sum, sub) => 
            sum + (sub.commission_amount || 0), 0
        );

        const totalRechargeAmount = thisMonthSubs.reduce((sum, sub) => 
            sum + sub.amount, 0
        );

        // Get unique devices recharged this month
        const uniqueDevicesRecharged = new Set(thisMonthSubs.map(sub => sub.id)).size;

        // Get total devices for recharge rate calculation
        const { data: sellerGateways } = await supabase
            .from('gateways')
            .select('current_device_count')
            .eq('owned_by', sellerId);

        const totalDevicesUnderSeller = sellerGateways
            ? sellerGateways.reduce((sum, gateway) => sum + gateway.current_device_count, 0)
            : 0;

        const rechargeRate = totalDevicesUnderSeller > 0 
            ? Math.floor((uniqueDevicesRecharged / totalDevicesUnderSeller) * 100)
            : 0;

        const earningsData = {
            thisMonth: Math.round(thisMonthEarnings),
            devicesRecharged: uniqueDevicesRecharged,
            totalRechargeAmount: Math.round(totalRechargeAmount),
            rechargeRate,
            totalEarnings: Math.round(totalEarnings)
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

// Function to load user profile data
export async function loadUserProfile() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { success: false, error: 'No authenticated user' };

        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (profileError) throw profileError;

        // Update user store
        user.set({
            name: profile.full_name || profile.email.split('@')[0],
            initials: getInitials(profile.full_name || profile.email),
            notifications: 0, // You can implement notification counting separately
            email: profile.email,
            role: profile.role
        });

        return { success: true, data: profile };

    } catch (err) {
        console.error('Error loading user profile:', err);
        return { success: false, error: err.message };
    }
}

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Helper function to get time ago string
function getTimeAgo(dateString) {
    if (!dateString) return 'Never';
    
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

// Function to initialize dashboard data
export async function initializeDashboard(sellerId = null) {
    try {
        // Load user profile first
        await loadUserProfile();
        
        // Load dashboard data
        const [mastersResult, statsResult] = await Promise.all([
            loadMastersData(sellerId),
            loadDashboardStats(sellerId)
        ]);

        // Load earnings data if seller
        if (sellerId) {
            await loadEarningsData(sellerId);
        }

        return {
            success: mastersResult.success && statsResult.success,
            masters: mastersResult,
            stats: statsResult
        };

    } catch (err) {
        console.error('Error initializing dashboard:', err);
        return { success: false, error: err.message };
    }
}

// Function to refresh all dashboard data
export async function refreshDashboard(sellerId = null) {
    return await initializeDashboard(sellerId);
}