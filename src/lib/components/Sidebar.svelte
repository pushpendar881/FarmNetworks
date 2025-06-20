<script>
    import { currentPage } from '../stores/dashboard.js';
    import { page } from '$app/stores';
    
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/seller/portal/dashboard' },
        { id: 'earnings', icon: '💰', label: 'Earnings', href: '/seller/portal/earnings' },
        { id: 'map', icon: '🗺️', label: 'Devices Map', href: '/seller/portal/map' },
        { id: 'settings', icon: '⚙️', label: 'Settings', href: '/seller/portal/settings' },
        { id: 'support', icon: '📞', label: 'Support', href: '/seller/portal/support' },
        { id: 'logout', icon: '🚪', label: 'Logout', href: '/seller/auth/login' }
    ];
    
    function isActive(href) {
        return $page.url.pathname === href;
    }
</script>

<nav class="sidebar">
    <div class="logo">
        <h1>DeviceNet</h1>
        <p>Seller Dashboard v1.0</p>
    </div>
    <ul class="nav-menu">
        {#each menuItems as item}
            <li class="nav-item">
                <a 
                    href={item.href} 
                    class="nav-link" 
                    class:active={isActive(item.href)}
                    data-sveltekit-preload-data="hover"
                >
                    <span class="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                </a>
            </li>
        {/each}
    </ul>
</nav>

<style>
    .sidebar {
        width: 280px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        padding: 20px 0;
        position: fixed;
        height: 100vh;
        overflow-y: auto;
        z-index: 100;
    }

    .logo {
        text-align: center;
        padding: 0 20px 30px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 30px;
    }

    .logo h1 {
        color: white;
        font-size: 24px;
        font-weight: 700;
        margin: 0;
    }

    .logo p {
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        margin: 5px 0 0 0;
    }

    .nav-menu {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .nav-item {
        margin-bottom: 5px;
    }

    .nav-link {
        display: flex;
        align-items: center;
        padding: 15px 25px;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        transition: all 0.3s ease;
        border-left: 3px solid transparent;
    }

    .nav-link:hover, .nav-link.active {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-left-color: #00ff88;
    }

    .nav-icon {
        width: 20px;
        height: 20px;
        margin-right: 15px;
        font-size: 18px;
    }

    @media (max-width: 768px) {
        .sidebar {
            width: 70px;
        }
        
        .nav-link span:not(.nav-icon) {
            display: none;
        }
    }
</style>