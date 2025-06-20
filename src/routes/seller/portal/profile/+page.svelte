<script>
    import { user } from '../../../../lib/stores/dashboard.js';
    
    let isEditing = false;
    let editedUser = { ...$user };
    
    function toggleEdit() {
        if (isEditing) {
            // Save changes
            user.update(u => ({ ...u, ...editedUser }));
        } else {
            // Start editing
            editedUser = { ...$user };
        }
        isEditing = !isEditing;
    }
    
    function cancelEdit() {
        isEditing = false;
        editedUser = { ...$user };
    }
</script>

<svelte:head>
    <title>Profile - DeviceNet Seller Dashboard</title>
</svelte:head>

<div class="profile-container">
    <div class="profile-header">
        <div class="profile-avatar">
            {$user.initials}
        </div>
        <div class="profile-info">
            <h1>{$user.name}</h1>
            <p class="profile-role">Seller</p>
            <p class="profile-email">{$user.email}</p>
        </div>
        <button class="edit-btn" on:click={toggleEdit}>
            {isEditing ? '💾 Save' : '✏️ Edit'}
        </button>
        {#if isEditing}
            <button class="cancel-btn" on:click={cancelEdit}>❌ Cancel</button>
        {/if}
    </div>
    
    <div class="profile-sections">
        <section class="profile-section">
            <h2>Personal Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <label>Full Name :</label>
                    {#if isEditing}
                        <input type="text" bind:value={editedUser.name} />
                    {:else}
                        <span>{$user.name}</span>
                    {/if}
                </div>
                
                <div class="info-item">
                    <label>Email :</label>
                    {#if isEditing}
                        <input type="email" bind:value={editedUser.email} />
                    {:else}
                        <span>{$user.email || 'Not provided'}</span>
                    {/if}
                </div>
                
                <div class="info-item">
                    <label>Phone</label>
                    {#if isEditing}
                        <input type="tel" bind:value={editedUser.phone} />
                    {:else}
                        <span>{$user.phone || 'Not provided'}</span>
                    {/if}
                </div>
                
                <div class="info-item">
                    <label>Location</label>
                    {#if isEditing}
                        <input type="text" bind:value={editedUser.location} />
                    {:else}
                        <span>{$user.location || 'Not provided'}</span>
                    {/if}
                </div>
            </div>
        </section>
        
        <section class="profile-section">
            <h2>Account Statistics</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">{$user.devicesCount || 0}</span>
                    <span class="stat-label">Total Devices</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{$user.totalEarnings || '$0'}</span>
                    <span class="stat-label">Total Earnings</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{$user.joinDate || 'N/A'}</span>
                    <span class="stat-label">Member Since</span>
                </div>
            </div>
        </section>
        
        <!-- <section class="profile-section">
            <h2>Security Settings</h2>
            <div class="security-actions">
                <button class="security-btn">🔒 Change Password</button>
                <button class="security-btn">📱 Two-Factor Authentication</button>
                <button class="security-btn">🔑 API Keys</button>
            </div>
        </section> -->
    </div>
</div>

<style>
    .profile-container {
        padding: 20px;
        max-width: 1000px;
        margin: 0 auto;
    }
    
    .profile-header {
        display: flex;
        align-items: center;
        gap: 20px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(59, 49, 49, 0.2);
        border-radius: 16px;
        padding: 30px;
        margin-bottom: 30px;
    }
    
    .profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(45deg, #667eea, #764ba2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgb(0, 0, 0);
        font-weight: 700;
        font-size: 24px;
        flex-shrink: 0;
    }
    
    .profile-info {
        flex: 1;
    }
    
    .profile-info h1 {
        color: black;
        margin: 0 0 5px 0;
        font-size: 28px;
    }
    
    .profile-role {
        color: #00ff88;
        margin: 0 0 5px 0;
        font-weight: 600;
    }
    
    .profile-email {
        color: black(255, 255, 255, 0.7);
        margin: 0;
    }
    
    .edit-btn, .cancel-btn {
        background: linear-gradient(135deg, #00ff88, #00cc6a);
        color: black;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        margin-left: 10px;
    }
    
    .cancel-btn {
        background: linear-gradient(135deg, #ff4757, #e84258);
    }
    
    .edit-btn:hover, .cancel-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
    
    .profile-sections {
        display: grid;
        gap: 25px;
    }
    
    .profile-section {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(76, 39, 39, 0.2);
        border-radius: 16px;
        padding: 25px;
    }
    
    .profile-section h2 {
        color: black;
        margin: 0 0 20px 0;
        font-size: 20px;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .info-item label {
        color: rgba(0, 0, 0, 0.8);
        font-weight: 600;
        font-size: 14px;
    }
    
    .info-item span {
        color: rgb(0, 0, 0);
        padding: 10px 0;
    }
    
    .info-item input {
        background: rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 10px 12px;
        color: white;
        font-size: 14px;
    }
    
    .info-item input::placeholder {
        color: rgba(0, 0, 0, 0.5);
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
    }
    
    .stat-item {
        text-align: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .stat-value {
        display: block;
        color: #00ff88;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 5px;
    }
    
    .stat-label {
        color: rgba(0, 0, 0, 0.7);
        font-size: 14px;
    }
    
    .security-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
    }
    
    .security-btn {
        background: rgba(0, 0, 0, 0.1);
        color: rgb(0, 0, 0);
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .security-btn:hover {
        background: rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
    }
    
    @media (max-width: 768px) {
        .profile-header {
            flex-direction: column;
            text-align: center;
        }
        
        .info-grid {
            grid-template-columns: 1fr;
        }
        
        .security-actions {
            flex-direction: column;
        }
    }
</style>