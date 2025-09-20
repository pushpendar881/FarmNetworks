<script>
    import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<Sidebar />
<main class="main-content">
    <slot />
</main>

<style>
    :global(body) {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :global(*, *::before, *::after) {
        box-sizing: border-box;
    }

    .main-content {
        margin-left: 260px;
        min-height: 100vh;
        padding: 32px 24px;
        background: #fff;
        transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* When sidebar is collapsed */
    :global(.sidebar.collapsed ~ .main-content) {
        margin-left: 70px;
    }

    @media (max-width: 768px) {
        .main-content {
            margin-left: 0;
            padding: 80px 15px 15px 15px;
        }
    }

    @media (max-width: 480px) {
        .main-content {
            margin-left: 0;
            padding: 70px 12px 12px 12px;
        }
    }
</style>