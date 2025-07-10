<script>
    import { onMount } from 'svelte';
    import { sellerStore, currentSeller, loading, error } from '$lib/stores/sellerStore.js';
    import { authStore } from '$lib/stores/auth.js';

    let sellerProfile = null;
    let isLoading = true;
    let errorMessage = null;
    let isEditing = false;
    let editForm = {};

    onMount(async () => {
        await loadSellerProfile();
    });

    async function loadSellerProfile() {
        isLoading = true;
        errorMessage = null;

        try {
            
            const result = await sellerStore.loadCurrentSeller();
            
            if (result.success) {
                sellerProfile = result.profile;
                console.log(sellerProfile);
                // Initialize edit form with current data
                editForm = {
                    full_name: sellerProfile.full_name || '',
                    phone: sellerProfile.phone || '',
                    business_name: sellerProfile.business_name || '',
                    business_type: sellerProfile.business_type || '',
                    address: sellerProfile.address || '',
                    city: sellerProfile.city || '',
                    state: sellerProfile.state || '',
                    pincode: sellerProfile.pincode || '',
                    gstin: sellerProfile.gstin || ''
                };
            } else {
                errorMessage = result.error;
            }
        } catch (err) {
            errorMessage = err.message;
        } finally {
            isLoading = false;
        }
    }

    function startEditing() {
        isEditing = true;
    }

    function cancelEditing() {
        isEditing = false;
        // Reset form to current data
        editForm = {
            full_name: sellerProfile.full_name || '',
            phone: sellerProfile.phone || '',
            business_name: sellerProfile.business_name || '',
            business_type: sellerProfile.business_type || '',
            address: sellerProfile.address || '',
            city: sellerProfile.city || '',
            state: sellerProfile.state || '',
            pincode: sellerProfile.pincode || '',
            gstin: sellerProfile.gstin || ''
        };
    }
    
    async function saveProfile() {
        try {
           console.log(editForm)
           console.log(sellerProfile.id)
            const result = await sellerStore.updateSeller(sellerProfile.id, editForm);
            
            if (result.success) {
                // Reload profile to get updated data
                await loadSellerProfile();
                isEditing = false;
                alert('Profile updated successfully!');
            } else {
                alert('Failed to update profile: ' + result.error);
            }
        } catch (err) {
            alert('Error updating profile: ' + err.message);
        }
    }

    // Format currency
    function formatCurrency(amount) {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }
</script>

<svelte:head>
    <title>Seller Profile - Farm Networks</title>
    <meta name="description" content="Manage your seller profile and business information" />
</svelte:head>

<div class="profile-page">
    <div class="page-header">
        <h1>Seller Profile</h1>
        <p>Manage your business information and profile details</p>
    </div>

    {#if isLoading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading your profile...</p>
        </div>
    {:else if errorMessage}
        <div class="error-state">
            <p>Error: {errorMessage}</p>
            <button on:click={loadSellerProfile} class="retry-btn">Retry</button>
        </div>
    {:else if sellerProfile}
        <div class="profile-content">
            <!-- Profile Header -->
            <div class="profile-header">
                <div class="profile-avatar">
                    {(sellerProfile.full_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div class="profile-info">
                    <h2>{sellerProfile.full_name || 'N/A'}</h2>
                    <p class="email">{sellerProfile.email}</p>
                    <p class="status">
                        Status: 
                        <span class="status-badge" class:active={sellerProfile.is_active}>
                            {sellerProfile.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </p>
                </div>
                <div class="profile-actions">
                    {#if !isEditing}
                        <button on:click={startEditing} class="edit-btn">✏️ Edit Profile</button>
                    {:else}
                        <button on:click={saveProfile} class="save-btn">💾 Save Changes</button>
                        <button on:click={cancelEditing} class="cancel-btn">❌ Cancel</button>
                    {/if}
                </div>
            </div>

            <!-- Profile Form -->
            <div class="profile-form">
                <div class="form-section">
                    <h3>Personal Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="full_name">Full Name</label>
                            <input 
                                id="full_name"
                                type="text" 
                                bind:value={editForm.full_name}
                                disabled={!isEditing}
                                placeholder="Enter your full name"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input 
                                id="phone"
                                type="tel" 
                                bind:value={editForm.phone}
                                disabled={!isEditing}
                                placeholder="Enter your phone number"
                            />
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Business Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="business_name">Business Name</label>
                            <input 
                                id="business_name"
                                type="text" 
                                bind:value={editForm.business_name}
                                disabled={!isEditing}
                                placeholder="Enter your business name"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="business_type">Business Type</label>
                            <input 
                                id="business_type"
                                type="text" 
                                bind:value={editForm.business_type}
                                disabled={!isEditing}
                                placeholder="e.g., Electronics, Agriculture, etc."
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="gstin">GSTIN</label>
                            <input 
                                id="gstin"
                                type="text" 
                                bind:value={editForm.gstin}
                                disabled={!isEditing}
                                placeholder="Enter your GSTIN"
                            />
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Address Information</h3>
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label for="address">Address</label>
                            <textarea 
                                id="address"
                                bind:value={editForm.address}
                                disabled={!isEditing}
                                placeholder="Enter your complete address"
                                rows="3"
                            ></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="city">City</label>
                            <input 
                                id="city"
                                type="text" 
                                bind:value={editForm.city}
                                disabled={!isEditing}
                                placeholder="Enter your city"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="state">State</label>
                            <input 
                                id="state"
                                type="text" 
                                bind:value={editForm.state}
                                disabled={!isEditing}
                                placeholder="Enter your state"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="pincode">Pincode</label>
                            <input 
                                id="pincode"
                                type="text" 
                                bind:value={editForm.pincode}
                                disabled={!isEditing}
                                placeholder="Enter your pincode"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Performance Metrics -->
            <!-- <div class="performance-section">
                <h3>Performance Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon">💰</div>
                        <div class="metric-content">
                            <div class="metric-value">{formatCurrency(sellerProfile.total_sales)}</div>
                            <div class="metric-label">Total Sales</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon">⭐</div>
                        <div class="metric-content">
                            <div class="metric-value">
                                {#if sellerProfile.rating > 0}
                                    {sellerProfile.rating.toFixed(1)}/5.0
                                {:else}
                                    No rating yet
                                {/if}
                            </div>
                            <div class="metric-label">Rating</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon">📅</div>
                        <div class="metric-content">
                            <div class="metric-value">{formatDate(sellerProfile.created_at)}</div>
                            <div class="metric-label">Joined Date</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon">📊</div>
                        <div class="metric-content">
                            <div class="metric-value">{sellerProfile.commission_rate || 0}%</div>
                            <div class="metric-label">Commission Rate</div>
                        </div>
                    </div>
                </div>
            </div> -->
        </div>
    {:else}
        <div class="no-profile">
            <p>No seller profile found. Please contact support.</p>
        </div>
    {/if}
</div>

<style>
    .profile-page {
        padding: 30px;
        max-width: 1000px;
        margin: 0 auto;
    }

    .page-header {
        text-align: center;
        margin-bottom: 40px;
    }

    .page-header h1 {
        font-size: 32px;
        font-weight: 700;
        color: #2d3748;
        margin: 0 0 10px 0;
    }

    .page-header p {
        font-size: 16px;
        color: #718096;
        margin: 0;
    }

    .loading-state, .error-state, .no-profile {
        text-align: center;
        padding: 60px 20px;
    }

    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .retry-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        margin-top: 20px;
    }

    .retry-btn:hover {
        background: #5a67d8;
    }

    .profile-content {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .profile-header {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .profile-avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: 700;
    }

    .profile-info {
        flex: 1;
    }

    .profile-info h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        color: #2d3748;
    }

    .profile-info .email {
        color: #667eea;
        margin: 0 0 4px 0;
    }

    .profile-info .status {
        color: #718096;
        margin: 0;
    }

    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        margin-left: 8px;
    }

    .status-badge.active {
        background: #c6f6d5;
        color: #22543d;
    }

    .status-badge.inactive {
        background: #fed7d7;
        color: #742a2a;
    }

    .profile-actions {
        display: flex;
        gap: 10px;
    }

    .edit-btn, .save-btn, .cancel-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
    }

    .edit-btn {
        background: #667eea;
        color: white;
    }

    .edit-btn:hover {
        background: #5a67d8;
    }

    .save-btn {
        background: #38a169;
        color: white;
    }

    .save-btn:hover {
        background: #2f855a;
    }

    .cancel-btn {
        background: #e53e3e;
        color: white;
    }

    .cancel-btn:hover {
        background: #c53030;
    }

    .profile-form {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .form-section {
        margin-bottom: 30px;
    }

    .form-section:last-child {
        margin-bottom: 0;
    }

    .form-section h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        color: #2d3748;
        font-weight: 600;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 10px;
    }

    .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    .form-group label {
        font-size: 14px;
        font-weight: 600;
        color: #4a5568;
        margin-bottom: 8px;
    }

    .form-group input,
    .form-group textarea {
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.3s;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #667eea;
    }

    .form-group input:disabled,
    .form-group textarea:disabled {
        background: #f7fafc;
        color: #718096;
        cursor: not-allowed;
    }

    .performance-section {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .performance-section h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        color: #2d3748;
        font-weight: 600;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .metric-icon {
        font-size: 24px;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
    }

    .metric-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .metric-label {
        font-size: 12px;
        opacity: 0.9;
        text-transform: uppercase;
    }

    .debug-section {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .debug-section h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        color: #2d3748;
        font-weight: 600;
    }

    .debug-section details {
        background: #f7fafc;
        border-radius: 8px;
        overflow: hidden;
    }

    .debug-section summary {
        padding: 16px;
        background: #e2e8f0;
        cursor: pointer;
        font-weight: 600;
        color: #4a5568;
    }

    .debug-section summary:hover {
        background: #cbd5e0;
    }

    .raw-data {
        padding: 16px;
        background: #2d3748;
        color: #e2e8f0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        overflow-x: auto;
        margin: 0;
    }

    @media (max-width: 768px) {
        .profile-page {
            padding: 20px;
        }

        .page-header h1 {
            font-size: 24px;
        }
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