<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  // Navigation items with proper routes
  const navItems = [
    { label: 'Dashboard', icon: '📊', href: '/admin/adminportal/dashboard' },
    { label: 'Device Management', icon: '📱', href: '/admin/adminportal/devices' },
    { label: 'Seller Management', icon: '👥', href: '/admin/adminportal/sellers' },
    { label: 'Map View', icon: '🗺️', href: '/admin/adminportal/MapView' },
  //   { label: 'Settings', icon: '⚙️', href: '/admin/adminportal/settings' }
  ];

  let mounted = false;
  let isCollapsed = false;
  let isMobile = false;
  let isOpen = false; // For mobile sidebar state

  onMount(() => {
      mounted = true;
      
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

  // Check if current route is active
  function isActive(href) {
    return $page.url.pathname === href;
  }

  // Handle navigation
  function handleNavigation(href) {
    goto(href);
    
    // Close mobile sidebar after navigation
    if (isMobile) {
        isOpen = false;
    }
  }

  // Handle logout
  function handleLogout() {
      goto('/admin/auth/login');
      
      // Close mobile sidebar after logout
      if (isMobile) {
          isOpen = false;
      }
  }

  // Toggle sidebar
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
<div 
  class="sidebar" 
  class:collapsed={!isMobile && isCollapsed}
  class:mobile-open={isMobile && isOpen}
>
  <div class="logo">
      <div class="logo-icon">FN</div>
      {#if !isCollapsed || isMobile}
          <div class="logo-text">
              <h2>FarmNetworks</h2>
              <p>Admin Portal</p>
          </div>
      {/if}
  </div>
  
  <nav class="navigation">
      {#each navItems as item, i}
          <button 
              class="nav-item" 
              class:active={isActive(item.href)}
              on:click={() => handleNavigation(item.href)}
              on:keydown={(e) => e.key === 'Enter' && handleNavigation(item.href)}
              title={(!isMobile && isCollapsed) ? item.label : ''}
              in:fly={{ x: -50, delay: mounted && !isMobile ? i * 100 : 0 }}
          >
              <span class="nav-icon">{item.icon}</span>
              {#if !isCollapsed || isMobile}
                  <span class="nav-label">{item.label}</span>
              {/if}
          </button>
      {/each}
  </nav>

  <!-- User Info Section -->
  <div class="user-section">
      <div class="user-info">
          <div class="user-avatar">👤</div>
          {#if !isCollapsed || isMobile}
              <div class="user-details">
                  <div class="user-name">Admin User</div>
                  <div class="user-role">Administrator</div>
              </div>
          {/if}
      </div>
      <button 
          class="logout-btn" 
          on:click={handleLogout}
          title={(!isMobile && isCollapsed) ? 'Logout' : ''}
      >
          <span class="logout-icon">🚪</span>
          {#if !isCollapsed || isMobile}
              <span class="logout-text">Logout</span>
          {/if}
      </button>
  </div>
</div>

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
      left: 260px;
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
      width: 280px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      padding: 2rem 0;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      top: 0;
      left: 0;
  }

  .sidebar.collapsed {
      width: 80px;
      padding: 2rem 0.5rem;
  }

  /* Mobile styles for sidebar */
  .sidebar {
      transform: translateX(0);
  }

  .logo {
      display: flex;
      align-items: center;
      padding: 0 2rem;
      margin-bottom: 3rem;
  }

  .sidebar.collapsed .logo {
      padding: 0 1rem;
      justify-content: center;
  }

  .logo-icon {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 1.2rem;
      margin-right: 1rem;
      flex-shrink: 0;
  }

  .sidebar.collapsed .logo-icon {
      margin-right: 0;
  }

  .logo-text h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a202c;
  }

  .logo-text p {
      margin: 0;
      font-size: 0.8rem;
      color: #6b7280;
  }

  .navigation {
      padding: 0 1rem;
      flex: 1;
  }

  .sidebar.collapsed .navigation {
      padding: 0 0.5rem;
  }

  .nav-item {
      display: flex;
      align-items: center;
      padding: 1rem 1rem;
      margin: 0.25rem 0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      color: #6b7280;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
      font-size: inherit;
      position: relative;
  }

  .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 1rem 0.5rem;
  }

  .nav-item:hover {
      background: rgba(102, 126, 234, 0.1);
      transform: translateX(5px);
      color: #667eea;
  }

  .sidebar.collapsed .nav-item:hover {
      transform: none;
  }

  .nav-item.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      transform: translateX(8px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .sidebar.collapsed .nav-item.active {
      transform: none;
  }

  .nav-icon {
      font-size: 1.2rem;
      margin-right: 1rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
  }

  .sidebar.collapsed .nav-icon {
      margin-right: 0;
  }

  .nav-label {
      font-size: 0.95rem;
  }

  /* Tooltip for collapsed desktop sidebar */
  .sidebar.collapsed .nav-item:hover::after {
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

  /* User Section */
  .user-section {
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      margin-top: auto;
  }

  .sidebar.collapsed .user-section {
      padding: 1.5rem 1rem;
  }

  .user-info {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
  }

  .sidebar.collapsed .user-info {
      justify-content: center;
  }

  .user-avatar {
      width: 40px;
      height: 40px;
      background: #4a5568;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      font-size: 1.2rem;
      flex-shrink: 0;
  }

  .sidebar.collapsed .user-avatar {
      margin-right: 0;
  }

  .user-name {
      font-weight: 600;
      color: #1a202c;
      font-size: 0.9rem;
  }

  .user-role {
      color: #6b7280;
      font-size: 0.8rem;
  }

  .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem;
      background: #fee2e2;
      color: #991b1b;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      position: relative;
  }

  .logout-btn:hover {
      background: #fecaca;
      transform: translateY(-2px);
  }

  .logout-icon {
      font-size: 1rem;
      margin-right: 0.5rem;
      flex-shrink: 0;
  }

  .sidebar.collapsed .logout-icon {
      margin-right: 0;
  }

  .logout-text {
      font-size: 0.9rem;
  }

  /* Tooltip for collapsed logout button */
  .sidebar.collapsed .logout-btn:hover::after {
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

  /* Mobile Responsive Design */
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

      .logo {
          padding: 0 2rem;
      }

      .navigation {
          padding: 0 1rem;
      }

      .nav-item {
          padding: 1rem 1rem;
          justify-content: flex-start;
      }

      .nav-icon {
          margin-right: 1rem;
      }

      .user-section {
          padding: 1.5rem 2rem;
      }

      .user-info {
          justify-content: flex-start;
      }

      .user-avatar {
          margin-right: 1rem;
      }

      .logout-icon {
          margin-right: 0.5rem;
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
  }

  /* Main content adjustments */
  :global(.main-content) {
      margin-left: 280px;
      padding: 20px;
      min-height: 100vh;
      box-sizing: border-box;
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.sidebar.collapsed ~ .main-content) {
      margin-left: 80px;
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
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
  }

  .sidebar::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
  }
</style>