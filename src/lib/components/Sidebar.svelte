<!-- <script>
    import { currentPage } from '../stores/dashboard.js';
    import { page } from '$app/stores';
    import { authStore } from '../stores/auth.js';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    
    let isCollapsed = false;
    let isMobile = false;
    
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/seller/portal/dashboard' },
        { id: 'earnings', icon: '💰', label: 'Earnings', href: '/seller/portal/earnings' },
        { id: 'map', icon: '🗺️', label: 'Devices Map', href: '/seller/portal/map' },
        // { id: 'settings', icon: '⚙️', label: 'Settings', href: '/seller/portal/settings' },
        { id: 'support', icon: '📞', label: 'Support', href: '/seller/portal/support' },
        { id: 'logout', icon: '🚪', label: 'Logout', action: 'logout' }
    ];
    
    onMount(() => {
        const checkScreenSize = () => {
            isMobile = window.innerWidth <= 768;
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    });
    
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
    
    function toggleSidebar() {
        isCollapsed = !isCollapsed;
    }
</script>

{#if isMobile}
  <button
    class="global-toggle-btn"
    on:click={toggleSidebar}
    aria-label="Toggle sidebar"
  >
    <span class="toggle-icon">{isCollapsed ? '→' : '←'}</span>
  </button>
{/if}

{#if !isMobile || (isMobile && !isCollapsed)}
<nav class="sidebar" class:collapsed={isCollapsed}>
    <div class="sidebar-header">
        <div class="logo">
            <h1>FN</h1>
            {#if !isCollapsed}
                <div class="logo-text">
                    <span class="brand-name">FarmNetwork</span>
                    <span class="version">v1.0</span>
                </div>
            {/if}
        </div>
    </div>
    
    <ul class="nav-menu">
        {#each menuItems as item}
            <li class="nav-item">
                {#if item.action === 'logout'}
                    <button 
                        on:click={handleLogout}
                        class="nav-link logout-button" 
                        type="button"
                        title={isCollapsed ? item.label : ''}
                    >
                        <span class="nav-icon">{item.icon}</span>
                        {#if !isCollapsed}
                            <span class="nav-label">{item.label}</span>
                        {/if}
                    </button>
                {:else}
                    <a 
                        href={item.href} 
                        class="nav-link" 
                        class:active={isActive(item.href)}
                        data-sveltekit-preload-data="hover"
                        title={isCollapsed ? item.label : ''}
                    >
                        <span class="nav-icon">{item.icon}</span>
                        {#if !isCollapsed}
                            <span class="nav-label">{item.label}</span>
                        {/if}
                    </a>
                {/if}
            </li>
        {/each}
    </ul>
</nav>
{/if}

{#if isMobile && !isCollapsed}
    <div class="mobile-overlay" on:click={toggleSidebar}></div>
{/if}

<style>
    .global-toggle-btn {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 2000;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        cursor: pointer;
        transition: background 0.2s;
    }

    .global-toggle-btn:hover {
        background: #f3f3f3;
    }

    @media (min-width: 769px) {
        .global-toggle-btn {
            display: none !important;
        }
    }

    .sidebar {
        width: 220px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        overflow-y: auto;
        z-index: 1000;
        box-sizing: border-box;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
    }

    .sidebar.collapsed {
        width: 65px;
    }

    .sidebar-header {
        padding: 20px 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .logo h1 {
        color: #00ff88;
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        line-height: 1;
        min-width: 35px;
        text-align: center;
        background: rgba(0, 255, 136, 0.1);
        padding: 8px;
        border-radius: 8px;
        flex-shrink: 0;
    }

    .logo-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .brand-name {
        color: white;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.2;
        margin: 0;
    }

    .version {
        color: rgba(255, 255, 255, 0.6);
        font-size: 11px;
        line-height: 1;
        margin: 2px 0 0 0;
    }

    .nav-menu {
        list-style: none;
        margin: 0;
        padding: 15px 0;
        flex: 1;
    }

    .nav-item {
        margin-bottom: 2px;
    }

    .nav-link {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        transition: all 0.2s ease;
        border-left: 3px solid transparent;
        width: 100%;
        background: none;
        border: none;
        border-radius: 0;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        box-sizing: border-box;
        text-align: left;
        position: relative;
        min-height: 44px;
    }

    .sidebar.collapsed .nav-link {
        justify-content: center;
        padding: 12px;
    }

    .nav-link:hover, .nav-link.active {
        background: rgba(255, 255, 255, 0.08);
        color: white;
        border-left-color: #00ff88;
    }

    .logout-button:hover {
        background: rgba(255, 59, 48, 0.15);
        border-left-color: #ff3b30;
    }

    .nav-icon {
        width: 20px;
        height: 20px;
        font-size: 16px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
    }

    .sidebar.collapsed .nav-icon {
        margin-right: 0;
    }

    .nav-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
        opacity: 1;
        transition: opacity 0.2s ease;
    }

   
    .sidebar.collapsed .nav-link {
        position: relative;
    }

    .sidebar.collapsed .nav-link:hover::after {
        content: attr(title);
        position: absolute;
        left: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1001;
        opacity: 0;
        animation: fadeIn 0.2s ease forwards;
    }

    @keyframes fadeIn {
        to { opacity: 1; }
    }

    .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        cursor: pointer;
    }

    @media (max-width: 768px) {
        .sidebar {
            width: 260px;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
        }
        
        .sidebar:not(.collapsed) {
            transform: translateX(0);
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3);
        }
        
        .sidebar-header {
            padding: 15px;
        }
        
        .logo {
            justify-content: flex-start;
        }
        
        .logo h1 {
            font-size: 18px;
        }
        
        .nav-menu {
            padding: 10px 0;
        }
        
        .nav-link {
            padding: 12px 15px;
            justify-content: flex-start;
            min-height: 44px;
        }
        
        .nav-icon {
            margin-right: 12px;
            font-size: 16px;
        }
        
        .nav-label {
            display: block;
        }
    }

   
    @media (max-width: 768px) {
        .sidebar.collapsed .nav-icon {
            margin-right: 12px;
        }
        
        .sidebar.collapsed .nav-link {
            justify-content: flex-start;
            padding: 12px 15px;
        }
        
        .sidebar.collapsed .logo-text {
            display: flex;
        }
    }
    @media (max-width: 480px) {
        .global-toggle-btn {
            top: 15px;
            left: 15px;
            width: 32px;
            height: 32px;
        }
        
        .logo h1 {
            font-size: 16px;
            padding: 6px;
        }
        
        .nav-link {
            padding: 10px 15px;
            min-height: 42px;
        }
        
        .nav-icon {
            font-size: 15px;
        }
    }

   
    :global(.main-content) {
        margin-left: 220px;
        padding: 20px;
        min-height: 100vh;
        box-sizing: border-box;
        transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.sidebar.collapsed ~ .main-content),
    :global(body:has(.sidebar.collapsed) .main-content) {
        margin-left: 65px;
    }

    @media (max-width: 768px) {
        :global(.main-content) {
            margin-left: 0;
            padding: 70px 15px 15px 15px;
        }
    }

    @media (max-width: 480px) {
        :global(.main-content) {
            margin-left: 0;
            padding: 55px 12px 12px 12px;
        }
    }

 
    .sidebar::-webkit-scrollbar {
        width: 4px;
    }

    .sidebar::-webkit-scrollbar-track {
        background: transparent;
    }

    .sidebar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
    }

    .sidebar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
</style> -->

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
        left: 0; /* Ensures it's always on the left */
        right: auto; /* Prevents it from appearing on the right */
        height: 100vh;
        overflow-y: auto;
        z-index: 1000; /* Increased z-index to ensure it's above other content */
        box-sizing: border-box;
        transform: translateX(0); /* Ensures no transformation moves it */
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
        text-align: left; /* Ensures text alignment is left */
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

    /* Mobile styles */
    @media (max-width: 768px) {
        .sidebar {
            width: 70px;
            left: 0; /* Explicitly set left position */
            right: auto; /* Ensure it doesn't appear on right */
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
        
        .logo h1 {
            font-size: 16px;
        }
        
        .logo p {
            display: none;
        }
    }

    /* Ensure body doesn't have conflicting styles */
    :global(body) {
        margin: 0;
        padding: 0;
        direction: ltr; /* Ensure left-to-right layout */
    }

    /* Main content area adjustments */
    :global(.main-content) {
        margin-left: 280px;
        margin-right: 0; /* Ensure no right margin */
        padding: 20px;
        min-height: 100vh;
        box-sizing: border-box;
    }

    @media (max-width: 768px) {
        :global(.main-content) {
            margin-left: 70px;
            margin-right: 0; /* Ensure no right margin on mobile */
        }
    }
</style>    