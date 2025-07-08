<script>
    import { currentPage } from '../stores/dashboard.js';
    import { page } from '$app/stores';
    import { authStore } from '../stores/auth.js';
    import { goto } from '$app/navigation';
    
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/seller/portal/dashboard' },
        { id: 'earnings', icon: '💰', label: 'Earnings', href: '/seller/portal/earnings' },
        { id: 'map', icon: '🗺️', label: 'Devices Map', href: '/seller/portal/map' },
        // { id: 'settings', icon: '⚙️', label: 'Settings', href: '/seller/portal/settings' },
        { id: 'support', icon: '📞', label: 'Support', href: '/seller/portal/support' },
        { id: 'logout', icon: '🚪', label: 'Logout', action: 'logout' }
    ];
    
    function isActive(href) {
        return $page.url.pathname === href;
    }
    
    async function handleLogout() {
        try {
            await authStore.signOut();
            // The signOut function will handle the redirect automatically
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback redirect
            goto('/seller/auth/login');
        }
    }
    
    function handleItemClick(item) {
        if (item.action === 'logout') {
            handleLogout();
        }
        // For other items, let the default link behavior handle navigation
    }
</script>

<nav class="sidebar">
    <div class="logo">
        <h1>FarmNetwork</h1>
        <p>Seller Dashboard v1.0</p>
    </div>
    <ul class="nav-menu">
        {#each menuItems as item}
            <li class="nav-item">
                {#if item.action === 'logout'}
                    <button 
                        on:click={handleLogout}
                        class="nav-link logout-button" 
                        type="button"
                    >
                        <span class="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                {:else}
                    <a 
                        href={item.href} 
                        class="nav-link" 
                        class:active={isActive(item.href)}
                        data-sveltekit-preload-data="hover"
                    >
                        <span class="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </a>
                {/if}
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
        top: 0;
        left: 0;
        height: 100vh;
        overflow-y: auto;
        z-index: 100;
        box-sizing: border-box;
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
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: inherit;
        box-sizing: border-box;
    }

    .nav-link:hover, .nav-link.active {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-left-color: #00ff88;
    }

    .logout-button:hover {
        background: rgba(255, 59, 48, 0.2);
        border-left-color: #ff3b30;
    }

    .nav-icon {
        width: 20px;
        height: 20px;
        margin-right: 15px;
        font-size: 18px;
        flex-shrink: 0;
    }

    @media (max-width: 768px) {
        .sidebar {
            width: 70px;
        }
        
        .nav-link span:not(.nav-icon) {
            display: none;
        }
        
        .nav-link {
            padding: 15px 10px;
            justify-content: center;
        }
        
        .nav-icon {
            margin-right: 0;
        }
    }

    /* Global styles for main content area - add this to your global CSS */
    :global(.main-content) {
        margin-left: 280px;
        padding: 20px;
        min-height: 100vh;
        box-sizing: border-box;
    }

    @media (max-width: 768px) {
        :global(.main-content) {
            margin-left: 70px;
        }
    }
</style>