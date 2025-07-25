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

    /* Remove flex container */

    .main-content {
        margin-left: 280px;
        min-height: 100vh;
        padding: 32px 24px;
        background: #fff;
    }

    @media (max-width: 768px) {
        .main-content {
            margin-left: 0;
            padding: 32px 8px;
        }
    }
</style>