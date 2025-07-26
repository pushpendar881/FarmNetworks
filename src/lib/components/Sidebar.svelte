<script>
    import { currentPage } from '../stores/dashboard.js';
    import { page } from '$app/stores';
    import { authStore } from '../stores/auth.js';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    
    let isCollapsed = false;
    let isMobile = false;
    let isOpen = false; // For mobile sidebar state
    
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/seller/portal/dashboard' },
        { id: 'earnings', icon: '💰', label: 'Earnings', href: '/seller/portal/earnings' },
        { id: 'map', icon: '🗺️', label: 'Devices Map', href: '/seller/portal/map' },
        { id: 'support', icon: '📞', label: 'Support', href: '/seller/portal/support' },
        { id: 'logout', icon: '🚪', label: 'Logout', action: 'logout' }
    ];
    
    onMount(() => {
        const checkScreenSize = () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth <= 768;
            
            // Reset states when switching between mobile/desktop
            if (wasMobile !== isMobile) {
                if (isMobile) {
                    isOpen = false; // Close mobile sidebar by default
                    isCollapsed = false; // Reset collapse state
                } else {
                    isOpen = false; // Not used on desktop
                    isCollapsed = false; // Default to expanded on desktop
                }
            }
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        // Close mobile sidebar when clicking outside
        const handleClickOutside = (event) => {
            if (isMobile && isOpen) {
                const sidebar = document.querySelector('.sidebar');
                const toggleBtn = document.querySelector('.mobile-toggle-btn');
                
                if (sidebar && !sidebar.contains(event.target) && 
                    toggleBtn && !toggleBtn.contains(event.target)) {
                    isOpen = false;
                }
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            window.removeEventListener('resize', checkScreenSize);
            document.removeEventListener('click', handleClickOutside);
        };
    });
    
    function isActive(href) {
        return $page.url.pathname === href;
    }
    
    async function handleLogout() {
        try {
            await authStore.signOut();
        } catch (error) {
            console.error('Logout error:', error);
            goto('/seller/auth/login');
        }
    }
    
    function handleItemClick(item) {
        if (item.action === 'logout') {
            handleLogout();
        }
        
        // Close mobile sidebar after navigation
        if (isMobile) {
            isOpen = false;
        }
    }
    
    function toggleSidebar() {
        if (isMobile) {
            isOpen = !isOpen;
        } else {
            isCollapsed = !isCollapsed;
        }
    }
</script>

<!-- Mobile toggle button -->
{#if isMobile}
    <button
        class="mobile-toggle-btn"
        on:click={toggleSidebar}
        aria-label="Toggle sidebar"
    >
        <span class="hamburger" class:active={isOpen}>
            <span></span>
            <span></span>
            <span></span>
        </span>
    </button>
{/if}

<!-- Desktop collapse toggle button -->
{#if !isMobile}
    <button
        class="desktop-toggle-btn"
        class:collapsed={isCollapsed}
        on:click={toggleSidebar}
        aria-label="Toggle sidebar"
    >
        <span class="toggle-icon">{isCollapsed ? '→' : '←'}</span>
    </button>
{/if}

<!-- Sidebar -->
<nav 
    class="sidebar" 
    class:collapsed={!isMobile && isCollapsed}
    class:mobile-open={isMobile && isOpen}
>
    <div class="sidebar-header">
        <div class="logo">
            <h1>FN</h1>
            {#if !isCollapsed || isMobile}
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
                        on:click={() => handleItemClick(item)}
                        class="nav-link logout-button" 
                        type="button"
                        title={(!isMobile && isCollapsed) ? item.label : ''}
                    >
                        <span class="nav-icon">{item.icon}</span>
                        {#if !isCollapsed || isMobile}
                            <span class="nav-label">{item.label}</span>
                        {/if}
                    </button>
                {:else}
                    <a 
                        href={item.href} 
                        class="nav-link" 
                        class:active={isActive(item.href)}
                        data-sveltekit-preload-data="hover"
                        title={(!isMobile && isCollapsed) ? item.label : ''}
                        on:click={() => handleItemClick(item)}
                    >
                        <span class="nav-icon">{item.icon}</span>
                        {#if !isCollapsed || isMobile}
                            <span class="nav-label">{item.label}</span>
                        {/if}
                    </a>
                {/if}
            </li>
        {/each}
    </ul>
</nav>

<!-- Mobile overlay -->
{#if isMobile && isOpen}
    <div class="mobile-overlay" on:click={toggleSidebar}></div>
{/if}

<style>
    /* Mobile toggle button */
    .mobile-toggle-btn {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 2001;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .mobile-toggle-btn:hover {
        background: rgba(255, 255, 255, 1);
        transform: scale(1.05);
    }

    /* Hamburger icon */
    .hamburger {
        width: 20px;
        height: 16px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .hamburger span {
        width: 100%;
        height: 2px;
        background: #333;
        border-radius: 1px;
        transition: all 0.3s ease;
        transform-origin: center;
    }

    .hamburger.active span:first-child {
        transform: rotate(45deg) translate(5px, 5px);
    }

    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }

    .hamburger.active span:last-child {
        transform: rotate(-45deg) translate(7px, -6px);
    }

    /* Desktop toggle button */
    .desktop-toggle-btn {
        position: fixed;
        top: 20px;
        left: 240px;
        z-index: 1001;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: #333;
    }

    .desktop-toggle-btn:hover {
        background: rgba(255, 255, 255, 1);
        transform: scale(1.1);
    }

    .desktop-toggle-btn.collapsed {
        left: 85px;
    }

    .toggle-icon {
        font-size: 14px;
        font-weight: bold;
        transition: transform 0.3s ease;
    }

    /* Sidebar */
    .sidebar {
        width: 260px;
        background: linear-gradient(180deg, #9370db 0%, #6a5acd 100%);
        backdrop-filter: blur(20px);
        border-right: none;
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        overflow-y: auto;
        z-index: 1000;
        box-sizing: border-box;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
    }

    .sidebar.collapsed {
        width: 70px;
    }

    /* Sidebar header */
    .sidebar-header {
        padding: 20px 15px;
        border-bottom: none;
        position: relative;
        background: transparent;
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

    /* Navigation menu */
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
        padding: 14px 15px;
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
        min-height: 48px;
    }

    .sidebar.collapsed .nav-link {
        justify-content: center;
        padding: 14px 12px;
    }

    .nav-link:hover, .nav-link.active {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        border-left-color: #00ff88;
        box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.1);
    }

    .logout-button:hover {
        background: rgba(255, 59, 48, 0.2);
        border-left-color: #ff3b30;
        box-shadow: inset 0 0 20px rgba(255, 59, 48, 0.1);
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

    /* Tooltip for collapsed desktop sidebar */
    .sidebar.collapsed .nav-link:hover::after {
        content: attr(title);
        position: absolute;
        left: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1001;
        opacity: 0;
        animation: fadeIn 0.2s ease forwards;
        pointer-events: none;
    }

    @keyframes fadeIn {
        to { opacity: 1; }
    }

    /* Mobile overlay */
    .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        cursor: pointer;
        backdrop-filter: blur(2px);
    }

    /* Mobile styles */
    @media (max-width: 768px) {
        .desktop-toggle-btn {
            display: none;
        }

        .sidebar {
            width: 280px;
            transform: translateX(-100%);
            box-shadow: none;
        }
        
        .sidebar.mobile-open {
            transform: translateX(0);
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
        }
        
        .sidebar-header {
            padding: 20px 15px;
        }
        
        .logo h1 {
            font-size: 18px;
        }
        
        .nav-menu {
            padding: 15px 0;
        }
        
        .nav-link {
            padding: 14px 15px;
            justify-content: flex-start;
            min-height: 48px;
        }
        
        .nav-icon {
            margin-right: 12px;
            font-size: 16px;
        }
        
        .nav-label {
            display: block;
        }

        /* Hide desktop toggle on mobile */
        .desktop-toggle-btn {
            display: none !important;
        }
    }

    @media (max-width: 480px) {
        .mobile-toggle-btn {
            top: 15px;
            left: 15px;
            width: 40px;
            height: 40px;
        }
        
        .sidebar {
            width: 260px;
        }
        
        .logo h1 {
            font-size: 16px;
            padding: 6px;
        }
        
        .nav-link {
            padding: 12px 15px;
            min-height: 44px;
        }
        
        .nav-icon {
            font-size: 15px;
        }
    }

    /* Main content adjustments */
    :global(.main-content) {
        margin-left: 260px;
        padding: 20px;
        min-height: 100vh;
        box-sizing: border-box;
        transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.sidebar.collapsed ~ .main-content) {
        margin-left: 70px;
    }

    @media (max-width: 768px) {
        :global(.main-content) {
            margin-left: 0;
            padding: 80px 15px 15px 15px;
        }
    }

    @media (max-width: 480px) {
        :global(.main-content) {
            margin-left: 0;
            padding: 70px 12px 12px 12px;
        }
    }

    /* Scrollbar styling */
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
</style>