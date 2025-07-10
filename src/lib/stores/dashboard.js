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
                current_device_count,
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
                        device_name,
                        device_type,
                        motor_status,
                        error_status,
                        installation_date,
                        warranty_until,
                        customer_name,
                        customer_phone,
                        customer_email
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
                allDeviceIds.add(device.id);
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
            currentDeviceCount: gateway.current_device_count,
            nodes: gateway.devices.map(device => {
                // Get device's subscriptions using the renamed map
                const deviceSubs = deviceSubscriptionsMap[device.id] || [];
                const latestSubscription = deviceSubs
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        
                return {
                    id: device.device_id,
                    name: device.device_name || device.device_id,
                    status: device.motor_status === 1 ? 'online' : 'offline',
                    lastActive: getTimeAgo(device.updated_at),
                    rechargeDate: latestSubscription 
                        ? new Date(latestSubscription.valid_from).toLocaleDateString('en-GB')
                        : 'Not recharged',
                    expiryDate: latestSubscription 
                        ? new Date(latestSubscription.valid_until).toLocaleDateString('en-GB')
                        : 'No active plan',
                    installDate: device.installation_date 
                        ? new Date(device.installation_date).toLocaleDateString('en-GB')
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

        // Get devices count
        let deviceQuery = supabase
            .from('devices')
            .select('*', { count: 'exact', head: true });
            
        if (sellerId) {
            deviceQuery = deviceQuery.eq('seller_id', sellerId);
        }
        
        const { count: totalDevices, error: deviceError } = await deviceQuery;
        if (deviceError) throw deviceError;

        // Get online devices count
        let onlineDeviceQuery = supabase
            .from('devices')
            .select('*', { count: 'exact', head: true })
            .eq('motor_status', 1);
            
        if (sellerId) {
            onlineDeviceQuery = onlineDeviceQuery.eq('seller_id', sellerId);
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
            .gte('valid_from', startOfMonth.toISOString())
            .eq('payment_status', 'completed');
            
        if (sellerId) {
            rechargeQuery = rechargeQuery.eq('seller_id', sellerId);
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
        // Get current month's subscriptions
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('amount, commission_amount')
            .eq('seller_id', sellerId)
            .eq('payment_status', 'completed')
            .gte('valid_from', startOfMonth.toISOString());
            
        if (subError) throw subError;

        // Calculate earnings
        const thisMonth = subscriptions?.reduce((sum, sub) => 
            sum + (parseFloat(sub.commission_amount) || 0), 0
        ) || 0;
        
        const devicesRecharged = subscriptions?.length || 0;
        const totalRechargeAmount = subscriptions?.reduce((sum, sub) => 
            sum + (parseFloat(sub.amount) || 0), 0
        ) || 0;

        // Get seller's commission rate and total sales
        const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('commission_rate, total_sales')
            .eq('id', sellerId)
            .single();

        const commissionRate = parseFloat(sellerProfile?.commission_rate) || 10;
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

// Function to load user profile
export async function loadUserProfile() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        user.update(state => ({
            ...state,
            name: profile.full_name,
            initials: getInitials(profile.full_name)
        }));

        return { success: true, profile };

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