<script>
  import Sidebar from '$lib/components/admin/sidebar.svelte';
</script>

<div class="admin-layout">
  <Sidebar />
  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: #f7fafc;
  }

  .main-content {
    flex: 1;
    margin-left: 280px;
    padding: 2rem;
    background: #f7fafc;
    min-height: 100vh;
  }

  @media (max-width: 768px) {
    .main-content {
      margin-left: 0;
      padding: 1rem;
    }
  }
</style> 