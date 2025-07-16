<script>
    import Header from '$lib/components/Header.svelte';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { supabase } from '$lib/supabase.js';
    import { sellerStore } from '$lib/stores/sellerStore.js';
    
    let sellerProfile = null;
    let isLoading = false;
    let errorMessage = null;
    let successMessage = null;
    
    // Form data
    let formData = {
        name: '',
        latitude: '',
        longitude: '',
        maxDevices: 100,
        coverageRadius: 1000
    };
    
    // Form validation
    let formErrors = {};
    
    onMount(async () => {
        // Load seller profile
        const result = await sellerStore.loadCurrentSeller();
        if (result.success) {
            sellerProfile = result.profile;
        } else {
            errorMessage = 'Failed to load seller profile';
        }
    });
    
    function validateForm() {
        formErrors = {};
        
        if (!formData.name.trim()) {
            formErrors.name = 'Master name is required';
        }
        
        if (!formData.latitude || !formData.longitude) {
            formErrors.coordinates = 'Both latitude and longitude are required';
        }
        
        if (formData.latitude && (formData.latitude < -90 || formData.latitude > 90)) {
            formErrors.latitude = 'Latitude must be between -90 and 90';
        }
        
        if (formData.longitude && (formData.longitude < -180 || formData.longitude > 180)) {
            formErrors.longitude = 'Longitude must be between -180 and 180';
        }
        
        if (formData.maxDevices < 1 || formData.maxDevices > 1000) {
            formErrors.maxDevices = 'Max devices must be between 1 and 1000';
        }
        
        if (formData.coverageRadius < 100 || formData.coverageRadius > 10000) {
            formErrors.coverageRadius = 'Coverage radius must be between 100 and 10000 meters';
        }
        
        return Object.keys(formErrors).length === 0;
    }
    
    async function handleSubmit() {
        if (!validateForm()) return;
        if (!sellerProfile) {
            errorMessage = 'Seller profile not loaded';
            return;
        }
        
        isLoading = true;
        errorMessage = null;
        successMessage = null;
        
        try {
            // Create the gateway with the new schema
            const { data: gateway, error: gatewayError } = await supabase
                .from('gateways')
                .insert([
                    {
                        name: formData.name.trim(),
                        latitude: parseFloat(formData.latitude),
                        longitude: parseFloat(formData.longitude),
                        max_devices: formData.maxDevices,
                        coverage_radius: formData.coverageRadius,
                        seller_id: sellerProfile.id,
                        status: 'active',
                        
                    }
                ])
                .select()
                .single();
            
            if (gatewayError) {
                throw new Error(gatewayError.message);
            }
            
            successMessage = 'Master gateway created successfully!';
            
            // Reset form
            formData = {
                name: '',
                latitude: '',
                longitude: '',
                maxDevices: 100,
                coverageRadius: 1000
            };
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                goto('/seller/portal/dashboard');
            }, 2000);
            
        } catch (error) {
            console.error('Error creating master:', error);
            errorMessage = error.message || 'Failed to create master gateway';
        } finally {
            isLoading = false;
        }
    }
    
    function handleCancel() {
        goto('/seller/portal/dashboard');
    }
    
    function getCurrentLocation() {
        if (!navigator.geolocation) {
            errorMessage = 'Geolocation is not supported by this browser';
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                formData.latitude = position.coords.latitude.toFixed(6);
                formData.longitude = position.coords.longitude.toFixed(6);
                errorMessage = null;
            },
            (error) => {
                errorMessage = 'Failed to get current location: ' + error.message;
            }
        );
    }
</script>

<svelte:head>
    <title>Add Master Gateway - Device Management System</title>
</svelte:head>

<Header title="Add Master Gateway" />

<div class="add-master-container">
    <div class="form-container">
        <div class="form-header">
            <h2>Create New Master Gateway</h2>
            <p>Add a new master gateway to manage devices in your network</p>
        </div>

        {#if errorMessage}
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                {errorMessage}
            </div>
        {/if}

        {#if successMessage}
            <div class="success-message">
                <span class="success-icon">✅</span>
                {successMessage}
            </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit}>
            <div class="form-grid">
                <!-- Master Name -->
                <div class="form-group">
                    <label for="name">Master Name *</label>
                    <input
                        id="name"
                        type="text"
                        bind:value={formData.name}
                        placeholder="e.g., Main Gateway Hub"
                        class:error={formErrors.name}
                        disabled={isLoading}
                    />
                    {#if formErrors.name}
                        <span class="field-error">{formErrors.name}</span>
                    {/if}
                </div>

                <!-- Coordinates Section -->
                <div class="form-group">
                    <label for="latitude">Latitude *</label>
                    <input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        bind:value={formData.latitude}
                        placeholder="e.g., 19.0760"
                        class:error={formErrors.latitude}
                        disabled={isLoading}
                    />
                    {#if formErrors.latitude}
                        <span class="field-error">{formErrors.latitude}</span>
                    {/if}
                </div>

                <div class="form-group">
                    <label for="longitude">Longitude *</label>
                    <input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        bind:value={formData.longitude}
                        placeholder="e.g., 72.8777"
                        class:error={formErrors.longitude}
                        disabled={isLoading}
                    />
                    {#if formErrors.longitude}
                        <span class="field-error">{formErrors.longitude}</span>
                    {/if}
                </div>

                <!-- Get Current Location Button -->
                <div class="form-group full-width">
                    <button
                        type="button"
                        class="location-btn"
                        on:click={getCurrentLocation}
                        disabled={isLoading}
                    >
                        📍 Get Current Location
                    </button>
                    {#if formErrors.coordinates}
                        <span class="field-error">{formErrors.coordinates}</span>
                    {/if}
                </div>

                <!-- Configuration -->
                <!-- <div class="form-group">
                    <label for="maxDevices">Max Devices</label>
                    <input
                        id="maxDevices"
                        type="number"
                        min="1"
                        max="1000"
                        bind:value={formData.maxDevices}
                        class:error={formErrors.maxDevices}
                        disabled={isLoading}
                    />
                    {#if formErrors.maxDevices}
                        <span class="field-error">{formErrors.maxDevices}</span>
                    {/if}
                </div> -->

                <div class="form-group">
                    <label for="coverageRadius">Coverage Radius (meters)</label>
                    <input
                        id="coverageRadius"
                        type="number"
                        min="100"
                        max="10000"
                        bind:value={formData.coverageRadius}
                        class:error={formErrors.coverageRadius}
                        disabled={isLoading}
                    />
                    {#if formErrors.coverageRadius}
                        <span class="field-error">{formErrors.coverageRadius}</span>
                    {/if}
                </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
                <button
                    type="button"
                    class="cancel-btn"
                    on:click={handleCancel}
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    class="submit-btn"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <span class="spinner"></span>
                        Creating Master...
                    {:else}
                        Create Master Gateway
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>

<style>
    .add-master-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 30px 20px;
    }

    .form-container {
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
    }

    .form-header {
        margin-bottom: 30px;
        text-align: center;
    }

    .form-header h2 {
        color: #2d3748;
        margin-bottom: 8px;
        font-size: 24px;
    }

    .form-header p {
        color: #718096;
        font-size: 14px;
    }

    .error-message, .success-message {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .error-message {
        background: #fed7d7;
        color: #c53030;
        border: 1px solid #feb2b2;
    }

    .success-message {
        background: #c6f6d5;
        color: #2f855a;
        border: 1px solid #9ae6b4;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    .form-group label {
        color: #4a5568;
        font-weight: 600;
        margin-bottom: 8px;
        font-size: 14px;
    }

    .form-group input,
    .form-group textarea {
        padding: 12px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #667eea;
    }

    .form-group input.error,
    .form-group textarea.error {
        border-color: #e53e3e;
    }

    .form-group input:disabled,
    .form-group textarea:disabled {
        background-color: #f7fafc;
        cursor: not-allowed;
    }

    .field-error {
        color: #e53e3e;
        font-size: 12px;
        margin-top: 4px;
    }

    .location-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
    }

    .location-btn:hover:not(:disabled) {
        background: #5a67d8;
    }

    .location-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .form-actions {
        display: flex;
        gap: 15px;
        justify-content: flex-end;
    }

    .cancel-btn {
        background: #e2e8f0;
        color: #4a5568;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
    }

    .cancel-btn:hover:not(:disabled) {
        background: #cbd5e0;
    }

    .submit-btn {
        background: #10b981;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .submit-btn:hover:not(:disabled) {
        background: #059669;
    }

    .submit-btn:disabled, .cancel-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .add-master-container {
            padding: 20px 10px;
        }

        .form-container {
            padding: 20px;
        }

        .form-grid {
            grid-template-columns: 1fr;
        }

        .form-actions {
            flex-direction: column;
        }

        .form-actions button {
            width: 100%;
        }
    }
</style>