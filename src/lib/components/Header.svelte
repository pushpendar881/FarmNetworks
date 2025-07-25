<script>
    import { user } from '../stores/dashboard.js';
    import { goto } from '$app/navigation';
    
    export let title = 'Dashboard';
    
    function showNotifications() {

        // alert('Notifications:\n\n• 3 devices need recharge within 5 days\n• New master installation request\n• Monthly earnings report available');
    }
    
    function navigateToProfile() {
        goto('/seller/portal/profile');
    }
</script>

<header class="header">
    <div class="header-top">
        <h1 class="page-title">{title}</h1>
        <div class="user-profile">
            <!-- <button class="notifications" on:click={showNotifications}>
                🔔
                {#if $user.notifications > 0}
                    <span class="notification-badge">{$user.notifications}</span>
                {/if}
            </button> -->
            <button class="user-avatar" on:click={navigateToProfile} title="Go to Profile">
                {$user.initials}
            </button>
        </div>
    </div>
</header>

<style>
    .header {
        padding: 25px 40px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        background: white;
        border-radius: 20px 0 0 0;
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }

    .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .page-title {
        font-size: 26px;
        font-weight: 700;
        color: #2d3748;
        margin: 0;
    }

    .user-profile {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    /* .notifications {
        position: relative;
        background: #667eea;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
    }

    .notifications:hover {
        background: #5a67d8;
        transform: scale(1.05);
    }

    .notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    } */

    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(45deg, #667eea, #764ba2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .user-avatar:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
</style>