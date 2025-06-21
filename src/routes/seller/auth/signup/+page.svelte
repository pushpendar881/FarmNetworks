<script>
    import { authStore, loading } from '$lib/stores/auth.js';
    import { addToast } from '$lib/stores/toast.js';
    import { goto } from '$app/navigation';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

    let formData = {
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        businessName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        agreeToTerms: false
    };

    let errors = {};
    let isSubmitting = false;

    const validateForm = () => {
        errors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        // Required fields validation
        if (!formData.fullName.trim()) {
            errors.fullName = 'Full name is required';
        }

        if (!formData.businessName.trim()) {
            errors.businessName = 'Business name is required';
        }

        if (!formData.phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
            errors.phone = 'Phone number must be 10 digits';
        }

        if (!formData.address.trim()) {
            errors.address = 'Address is required';
        }

        if (!formData.city.trim()) {
            errors.city = 'City is required';
        }

        if (!formData.state.trim()) {
            errors.state = 'State is required';
        }

        if (!formData.pincode.trim()) {
            errors.pincode = 'Pincode is required';
        } else if (!/^\d{6}$/.test(formData.pincode)) {
            errors.pincode = 'Pincode must be 6 digits';
        }

        if (!formData.agreeToTerms) {
            errors.agreeToTerms = 'You must agree to the terms and conditions';
        }

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            addToast('Please fix the errors below', 'error');
            return;
        }

        isSubmitting = true;

        try {
            const result = await authStore.signupSeller(formData);

            if (result.success) {
                addToast('Account created successfully! Please check your email to verify your account.', 'success');
                goto('/seller/auth/login');
            } else {
                addToast(result.error, 'error');
            }
        } catch (error) {
            addToast('An unexpected error occurred. Please try again.', 'error');
        } finally {
            isSubmitting = false;
        }
    };

    const formatPhoneNumber = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3').replace(/-{1,2}$/, '');
        }
        return numbers.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    $: if (formData.phone) {
        formData.phone = formatPhoneNumber(formData.phone);
    }
</script>

<svelte:head>
    <title>Seller Signup - Farm Networks</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
        <div>
            <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
                <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Create Seller Account
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
                Join our farming network and start selling your products
            </p>
        </div>

        <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
            <div class="space-y-4">
                <!-- Personal Information -->
                <div>
                    <label for="fullName" class="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        bind:value={formData.fullName}
                        class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.fullName ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                        placeholder="Enter your full name"
                    />
                    {#if errors.fullName}
                        <p class="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    {/if}
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        bind:value={formData.email}
                        class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.email ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                        placeholder="Enter your email address"
                    />
                    {#if errors.email}
                        <p class="mt-1 text-sm text-red-600">{errors.email}</p>
                    {/if}
                </div>

                <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        bind:value={formData.phone}
                        class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.phone ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                        placeholder="Enter your phone number"
                    />
                    {#if errors.phone}
                        <p class="mt-1 text-sm text-red-600">{errors.phone}</p>
                    {/if}
                </div>

                <!-- Business Information -->
                <div class="pt-4 border-t border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                    
                    <div>
                        <label for="businessName" class="block text-sm font-medium text-gray-700">Business Name</label>
                        <input
                            id="businessName"
                            name="businessName"
                            type="text"
                            bind:value={formData.businessName}
                            class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.businessName ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                            placeholder="Enter your business name"
                        />
                        {#if errors.businessName}
                            <p class="mt-1 text-sm text-red-600">{errors.businessName}</p>
                        {/if}
                    </div>

                    <div class="mt-4">
                        <label for="address" class="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                            id="address"
                            name="address"
                            rows="3"
                            bind:value={formData.address}
                            class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.address ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                            placeholder="Enter your full address"
                        ></textarea>
                        {#if errors.address}
                            <p class="mt-1 text-sm text-red-600">{errors.address}</p>
                        {/if}
                    </div>

                    <div class="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <label for="city" class="block text-sm font-medium text-gray-700">City</label>
                            <input
                                id="city"
                                name="city"
                                type="text"
                                bind:value={formData.city}
                                class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.city ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="City"
                            />
                            {#if errors.city}
                                <p class="mt-1 text-sm text-red-600">{errors.city}</p>
                            {/if}
                        </div>

                        <div>
                            <label for="state" class="block text-sm font-medium text-gray-700">State</label>
                            <input
                                id="state"
                                name="state"
                                type="text"
                                bind:value={formData.state}
                                class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.state ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="State"
                            />
                            {#if errors.state}
                                <p class="mt-1 text-sm text-red-600">{errors.state}</p>
                            {/if}
                        </div>
                    </div>

                    <div class="mt-4">
                        <label for="pincode" class="block text-sm font-medium text-gray-700">Pincode</label>
                        <input
                            id="pincode"
                            name="pincode"
                            type="text"
                            maxlength="6"
                            bind:value={formData.pincode}
                            class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.pincode ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                            placeholder="Enter 6-digit pincode"
                        />
                        {#if errors.pincode}
                            <p class="mt-1 text-sm text-red-600">{errors.pincode}</p>
                        {/if}
                    </div>
                </div>

                <!-- Password Section -->
                <div class="pt-4 border-t border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Security Information</h3>
                    
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            bind:value={formData.password}
                            class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.password ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                            placeholder="Create a password"
                        />
                        {#if errors.password}
                            <p class="mt-1 text-sm text-red-600">{errors.password}</p>
                        {/if}
                    </div>

                    <div class="mt-4">
                        <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            bind:value={formData.confirmPassword}
                            class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                            placeholder="Confirm your password"
                        />
                        {#if errors.confirmPassword}
                            <p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                        {/if}
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="pt-4">
                    <div class="flex items-center">
                        <input
                            id="agreeToTerms"
                            name="agreeToTerms"
                            type="checkbox"
                            bind:checked={formData.agreeToTerms}
                            class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label for="agreeToTerms" class="ml-2 block text-sm text-gray-900">
                            I agree to the 
                            <a href="/terms" class="text-green-600 hover:text-green-500 underline">Terms and Conditions</a>
                            and 
                            <a href="/privacy" class="text-green-600 hover:text-green-500 underline">Privacy Policy</a>
                        </label>
                    </div>
                    {#if errors.agreeToTerms}
                        <p class="mt-1 text-sm text-red-600">{errors.agreeToTerms}</p>
                    {/if}
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {#if isSubmitting}
                        <LoadingSpinner size="sm" />
                        <span class="ml-2">Creating Account...</span>
                    {:else}
                        Create Seller Account
                    {/if}
                </button>
            </div>

            <div class="text-center">
                <p class="text-sm text-gray-600">
                    Already have an account?
                    <a href="/seller/auth/login" class="font-medium text-green-600 hover:text-green-500">
                        Sign in here
                    </a>
                </p>
            </div>
        </form>
    </div>
</div>