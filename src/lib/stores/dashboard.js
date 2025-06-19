import { writable, derived } from 'svelte/store';

// Dashboard state
export const currentPage = writable('dashboard');
export const user = writable({
    name: 'Suresh Kumar',
    initials: 'SK',
    notifications: 3
});

// Device data
export const masters = writable([
    {
        id: 'Master-001',
        location: 'Delhi North',
        status: 'online',
        range: '2km radius',
        installed: '15 Jan 2024',
        nodes: [
            {
                id: 'Node-001',
                status: 'online',
                lastActive: '2 mins ago',
                rechargeDate: '12 Jun 2025',
                expiryDate: '12 Jul 2025',
                installDate: '15 Jan 2024'
            },
            {
                id: 'Node-002',
                status: 'online',
                lastActive: '5 mins ago',
                rechargeDate: '10 Jun 2025',
                expiryDate: '10 Jul 2025',
                installDate: '20 Jan 2024'
            },
            {
                id: 'Node-003',
                status: 'offline',
                lastActive: '2 hours ago',
                rechargeDate: '5 Jun 2025',
                expiryDate: '5 Jul 2025',
                installDate: '25 Jan 2024'
            }
        ]
    },
    {
        id: 'Master-002',
        location: 'Delhi South',
        status: 'online',
        range: '2km radius',
        installed: '20 Jan 2024',
        nodes: [
            {
                id: 'Node-004',
                status: 'online',
                lastActive: '1 min ago',
                rechargeDate: '14 Jun 2025',
                expiryDate: '14 Jul 2025',
                installDate: '1 Feb 2024'
            },
            {
                id: 'Node-005',
                status: 'online',
                lastActive: '3 mins ago',
                rechargeDate: '16 Jun 2025',
                expiryDate: '16 Jul 2025',
                installDate: '5 Feb 2024'
            }
        ]
    }
]);

// Derived stats
export const stats = derived(masters, ($masters) => {
    const totalMasters = $masters.length;
    const totalDevices = $masters.reduce((acc, master) => acc + master.nodes.length, 0);
    const onlineDevices = $masters.reduce((acc, master) => 
        acc + master.nodes.filter(node => node.status === 'online').length, 0
    );
    const rechargedThisMonth = Math.floor(totalDevices * 0.76);
    
    return {
        totalMasters,
        totalDevices,
        onlineDevices,
        rechargedThisMonth,
        uptimePercent: ((onlineDevices / totalDevices) * 100).toFixed(1),
        rechargeRate: Math.floor((rechargedThisMonth / totalDevices) * 100)
    };
});

// Earnings data
export const earnings = writable({
    thisMonth: 2847,
    devicesRecharged: 189,
    totalRechargeAmount: 56940,
    rechargeRate: 76,
    totalEarnings: 45680
});