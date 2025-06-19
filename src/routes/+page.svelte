<script>
  import {goto} from "$app/navigation";
  
    let showLoginOptions = false;
  
    function navigateTo(path) {
      goto(path,{replaceState:true})
      showLoginOptions = false; // Hide menu after navigation
    }
  
    function toggleLoginOptions() {
      showLoginOptions = !showLoginOptions;
    }
  </script>
  
  <!-- Header Container -->
  <div class="flex items-center justify-between h-20 px-6 bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl shadow-lg relative">
    <!-- Title -->
    <button 
      on:click={() => navigateTo('/')}
      class="text-white text-3xl font-bold hover:text-purple-100 transition-colors cursor-pointer"
    >
      🌾 FarmNetworks
    </button>
  
    <!-- Navigation Menu -->
    <div class="flex items-center space-x-4">
      <!-- Other Portals (optional) -->
    
      <!-- Login Button with Dropdown -->
      <div class="relative">
        <button
          on:click={toggleLoginOptions}
          class="px-6 py-2 bg-white text-purple-500 hover:bg-purple-50 border-2 border-white rounded-lg font-semibold transition-all hover:scale-105 shadow-md"
        >
          Login
        </button>
  
        {#if showLoginOptions}
          <div class="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-10">
            <button
              on:click={() => navigateTo('/admin/auth/login')}
              class="block w-full text-left px-4 py-2 hover:bg-purple-100 text-purple-700"
            >
              Admin Login
            </button>
            <button
              on:click={() => navigateTo('/seller/auth/login')}
              class="block w-full text-left px-4 py-2 hover:bg-purple-100 text-purple-700"
            >
              Seller Login
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
  