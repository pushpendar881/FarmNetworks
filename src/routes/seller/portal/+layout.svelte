<script>
    import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<div class="container">
    <Sidebar />
    <main class="main-content">
        <slot />
    </main>
</div>

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

    .container {
        display: flex;
        min-height: 100vh;
    }

    .main-content {
        flex: 1;
        margin-left: 280px;
        min-height: 100vh;
        padding: 32px 24px; /* Optional: for inner spacing */
        background: #fff;   /* Solid white background */
    }

    @media (max-width: 768px) {
        .main-content {
            margin-left: 70px;
        }
    }
</style>