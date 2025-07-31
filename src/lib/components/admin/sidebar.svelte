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
  
    onMount(() => {
      mounted = true;
    });

    // Check if current route is active
    function isActive(href) {
      return $page.url.pathname === href;
    }

    // Handle navigation
    function handleNavigation(href) {
      goto(href);
    }
  </script>
  
  <div class="sidebar">
    <div class="logo">
      <div class="logo-icon">FN</div>
      <div class="logo-text">
        <h2>FarmNetworks</h2>
        <p>Admin Portal</p>
      </div>
    </div>
    
    <nav class="navigation">
      {#each navItems as item, i}
        <button 
          class="nav-item" 
          class:active={isActive(item.href)}
          on:click={() => handleNavigation(item.href)}
          on:keydown={(e) => e.key === 'Enter' && handleNavigation(item.href)}
          in:fly={{ x: -50, delay: i * 100 }}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
        </button>
      {/each}
    </nav>

    <!-- User Info Section -->
    <div class="user-section">
      <div class="user-info">
        <div class="user-avatar">👤</div>
        <div class="user-details">
          <div class="user-name">Admin User</div>
          <div class="user-role">Administrator</div>
        </div>
      </div>
      <button class="logout-btn" on:click={() => goto('/admin/auth/login')}>
        <span class="logout-icon">🚪</span>
        <span class="logout-text">Logout</span>
      </button>
    </div>
  </div>
  
  <style>
    .sidebar {
      width: 280px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      padding: 2rem 0;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      z-index: 10;
      display: flex;
      flex-direction: column;
    }
  
    .logo {
      display: flex;
      align-items: center;
      padding: 0 2rem;
      margin-bottom: 3rem;
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
    }
  
    .nav-item:hover {
      background: rgba(102, 126, 234, 0.1);
      transform: translateX(5px);
      color: #667eea;
    }
  
    .nav-item.active {
      color: rgb(0, 0, 0);
      transform: translateX(8px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
  
    .nav-icon {
      font-size: 1.2rem;
      margin-right: 1rem;
      width: 24px;
      text-align: center;
    }

    .nav-label {
      font-size: 0.95rem;
    }

    /* User Section */
    .user-section {
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      margin-top: auto;
    }

    .user-info {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
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
    }

    .logout-btn:hover {
      background: #fecaca;
      transform: translateY(-2px);
    }

    .logout-icon {
      font-size: 1rem;
      margin-right: 0.5rem;
    }

    .logout-text {
      font-size: 0.9rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        height: auto;
        position: relative;
      }
    }
  </style>