<script>
    import { authStore, loading } from '$lib/stores/auth.js';
    import { addToast } from '$lib/stores/toast.js';
    import { goto } from '$app/navigation';
    
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
    let showPasswordRequirements = false;
    let debugMode = true; // Enable debug logs
    let hasAttemptedSubmit = false; // Track if user has tried to submit

    // Debug logging function
    const debugLog = (message, data = null) => {
        if (debugMode) {
            console.log(`[DEBUG] ${message}`, data);
        }
    };

    // Enhanced validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email?.trim());
    };

    const validatePassword = (password) => {
        const requirements = {
            length: password?.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
        };
        
        const isValid = Object.values(requirements).every(req => req);
        return { isValid, requirements };
    };

    const validatePhone = (phone) => {
        const cleanPhone = phone?.replace(/\D/g, '');
        return cleanPhone && cleanPhone.length === 10;
    };

    const validatePincode = (pincode) => {
        return /^\d{6}$/.test(pincode);
    };

    const validateForm = () => {
        debugLog('Starting form validation...');
        const newErrors = {};

        // Email validation
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else {
            const { isValid, requirements } = validatePassword(formData.password);
            if (!isValid) {
                const missing = [];
                if (!requirements.length) missing.push('at least 8 characters');
                if (!requirements.uppercase) missing.push('one uppercase letter');
                if (!requirements.lowercase) missing.push('one lowercase letter');
                if (!requirements.number) missing.push('one number');
                
                newErrors.password = `Password must contain ${missing.join(', ')}`;
            }
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // Required fields validation
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        } else if (formData.fullName.trim().length < 2) {
            newErrors.fullName = 'Full name must be at least 2 characters';
        }

        if (!formData.businessName.trim()) {
            newErrors.businessName = 'Business name is required';
        } else if (formData.businessName.trim().length < 2) {
            newErrors.businessName = 'Business name must be at least 2 characters';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(formData.phone)) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        } else if (formData.address.trim().length < 10) {
            newErrors.address = 'Please enter a complete address';
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City is required';
        } else if (formData.city.trim().length < 2) {
            newErrors.city = 'Please enter a valid city name';
        }

        if (!formData.state.trim()) {
            newErrors.state = 'State is required';
        } else if (formData.state.trim().length < 2) {
            newErrors.state = 'Please enter a valid state name';
        }

        if (!formData.pincode.trim()) {
            newErrors.pincode = 'Pincode is required';
        } else if (!validatePincode(formData.pincode)) {
            newErrors.pincode = 'Please enter a valid 6-digit pincode';
        }

        if (!formData.agreeToTerms) {
            newErrors.agreeToTerms = 'You must agree to the terms and conditions';
        }

        const isFormValid = Object.keys(newErrors).length === 0;
        debugLog('Form validation completed', { isValid: isFormValid, errors: newErrors });
        return { isValid: isFormValid, errors: newErrors };
    };

    const handleSubmit = async (event) => {
        debugLog('Form submission started', { event, formData });
        
        // Prevent default form submission
        if (event) {
            event.preventDefault();
        }

        // Mark that submit has been attempted
        hasAttemptedSubmit = true;

        // Check if already submitting
        if (isSubmitting) {
            debugLog('Form already submitting, ignoring duplicate submission');
            return;
        }

        // Check if authStore exists
        if (!authStore || typeof authStore.signupSeller !== 'function') {
            debugLog('authStore not available or signupSeller method missing');
            addToast('Authentication service not available', 'error');
            return;
        }

        // Validate form
        const validation = validateForm();
        errors = validation.errors;
        
        if (!validation.isValid) {
            debugLog('Form validation failed', validation.errors);
            addToast('Please fix the errors below', 'error');
            return;
        }

        debugLog('Form validation passed, starting submission');
        isSubmitting = true;

        try {
            // Add some visual feedback
            debugLog('Calling authStore.signupSeller...');
            
            const result = await authStore.signupSeller(formData);
            
            debugLog('authStore.signupSeller result:', result);

            if (result && result.success) {
                debugLog('Signup successful', result);
                const message = result.message || 'Account created successfully! Please check your email to verify your account.';
                addToast(message, 'success');
                
                // Navigate to login page
                try {
                    await goto('/seller/auth/login');
                } catch (navError) {
                    debugLog('Navigation error:', navError);
                    // Fallback navigation
                    window.location.href = '/seller/auth/login';
                }
            } else {
                debugLog('Signup failed', result);
                
                if (result && result.errors) {
                    // Handle validation errors from the server
                    errors = { ...errors, ...result.errors };
                    addToast('Please fix the errors below', 'error');
                } else {
                    const errorMessage = result?.error || 'An error occurred during registration';
                    addToast(errorMessage, 'error');
                }
            }
        } catch (error) {
            debugLog('Signup error caught:', error);
            console.error('Signup error:', error);
            
            // More detailed error handling
            let errorMessage = 'An unexpected error occurred. Please try again.';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            addToast(errorMessage, 'error');
        } finally {
            debugLog('Form submission completed');
            isSubmitting = false;
        }
    };

    // Test function to check if services are available
    const testServices = () => {
        debugLog('Testing services...');
        debugLog('authStore available:', !!authStore);
        debugLog('authStore.signupSeller available:', !!(authStore && authStore.signupSeller));
        debugLog('addToast available:', !!addToast);
        debugLog('goto available:', !!goto);
        debugLog('loading store available:', !!loading);
    };

    // Test services on component mount
    testServices();

    const formatPhoneNumber = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3').replace(/-{1,2}$/, '');
        }
        return numbers.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    const formatPincode = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers.slice(0, 6);
    };

    // Real-time validation for password
    $: if (formData.password && hasAttemptedSubmit) {
        const { isValid, requirements } = validatePassword(formData.password);
        if (!isValid) {
            showPasswordRequirements = true;
        } else {
            showPasswordRequirements = false;
            if (errors.password) {
                delete errors.password;
                errors = { ...errors };
            }
        }
    }

    // Real-time validation for confirm password
    $: if (formData.confirmPassword && formData.password && hasAttemptedSubmit) {
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        } else {
            delete errors.confirmPassword;
        }
        errors = { ...errors };
    }

    // Real-time validation for email
    $: if (formData.email && hasAttemptedSubmit) {
        if (!validateEmail(formData.email)) {
            errors.email = 'Please enter a valid email address';
        } else {
            delete errors.email;
        }
        errors = { ...errors };
    }

    // Real-time validation for phone
    $: if (formData.phone && hasAttemptedSubmit) {
        if (!validatePhone(formData.phone)) {
            errors.phone = 'Please enter a valid 10-digit phone number';
        } else {
            delete errors.phone;
        }
        errors = { ...errors };
    }

    // Real-time validation for pincode
    $: if (formData.pincode && hasAttemptedSubmit) {
        if (!validatePincode(formData.pincode)) {
            errors.pincode = 'Please enter a valid 6-digit pincode';
        } else {
            delete errors.pincode;
        }
        errors = { ...errors };
    }

    // Show password requirements when focused
    $: if (formData.password) {
        const { isValid } = validatePassword(formData.password);
        if (!isValid && formData.password.length > 0) {
            showPasswordRequirements = true;
        } else if (isValid) {
            showPasswordRequirements = false;
        }
    }

    // Handle input formatting
    const handlePhoneInput = (e) => {
        const formatted = formatPhoneNumber(e.target.value);
        formData.phone = formatted;
    };

    const handlePincodeInput = (e) => {
        const formatted = formatPincode(e.target.value);
        formData.pincode = formatted;
    };

    // Clear field errors when user starts typing
    const clearFieldError = (fieldName) => {
        if (errors[fieldName]) {
            delete errors[fieldName];
            errors = { ...errors };
        }
    };

    // Computed property for form validity (for debug display)
    $: formValidation = validateForm();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
        <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Create Seller Account
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
                Join our platform and start selling your products
            </p>
            
            <!-- Debug Panel (remove in production) -->
            {#if debugMode}
                <div class="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-md">
                    <h3 class="text-sm font-medium text-yellow-800">Debug Info</h3>
                    <p class="text-xs text-yellow-700">
                        Form Valid: {formValidation.isValid ? 'Yes' : 'No'} |
                        Submitting: {isSubmitting ? 'Yes' : 'No'} |
                        Errors: {Object.keys(errors).length} |
                        Attempted Submit: {hasAttemptedSubmit ? 'Yes' : 'No'}
                    </p>
                    <button 
                        type="button"
                        class="mt-2 text-xs bg-yellow-200 px-2 py-1 rounded"
                        on:click={testServices}
                    >
                        Test Services
                    </button>
                </div>
            {/if}
        </div>

        <form class="mt-8 space-y-6" on:submit={handleSubmit}>
            <div class="space-y-4">
                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">
                        Email Address *
                    </label>
                    <input
                        id="email"
                        type="email"
                        bind:value={formData.email}
                        on:input={() => clearFieldError('email')}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.email}
                        class:focus:ring-red-500={errors.email}
                        class:focus:border-red-500={errors.email}
                        placeholder="Enter your email"
                        required
                    />
                    {#if errors.email}
                        <p class="mt-1 text-sm text-red-600">{errors.email}</p>
                    {/if}
                </div>

                <!-- Password -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">
                        Password *
                    </label>
                    <input
                        id="password"
                        type="password"
                        bind:value={formData.password}
                        on:input={() => clearFieldError('password')}
                        on:focus={() => showPasswordRequirements = true}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.password}
                        class:focus:ring-red-500={errors.password}
                        class:focus:border-red-500={errors.password}
                        placeholder="Create a strong password"
                        required
                    />
                    {#if errors.password}
                        <p class="mt-1 text-sm text-red-600">{errors.password}</p>
                    {/if}
                    {#if showPasswordRequirements && formData.password}
                        <div class="mt-2 text-xs text-gray-600">
                            <p class="font-medium">Password requirements:</p>
                            <ul class="mt-1 space-y-1">
                                <li class:text-green-600={validatePassword(formData.password).requirements.length}>
                                    ✓ At least 8 characters
                                </li>
                                <li class:text-green-600={validatePassword(formData.password).requirements.uppercase}>
                                    ✓ One uppercase letter
                                </li>
                                <li class:text-green-600={validatePassword(formData.password).requirements.lowercase}>
                                    ✓ One lowercase letter
                                </li>
                                <li class:text-green-600={validatePassword(formData.password).requirements.number}>
                                    ✓ One number
                                </li>
                            </ul>
                        </div>
                    {/if}
                </div>

                <!-- Confirm Password -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                        Confirm Password *
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        bind:value={formData.confirmPassword}
                        on:input={() => clearFieldError('confirmPassword')}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.confirmPassword}
                        class:focus:ring-red-500={errors.confirmPassword}
                        class:focus:border-red-500={errors.confirmPassword}
                        placeholder="Confirm your password"
                        required
                    />
                    {#if errors.confirmPassword}
                        <p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    {/if}
                </div>

                <!-- Full Name -->
                <div>
                    <label for="fullName" class="block text-sm font-medium text-gray-700">
                        Full Name *
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        bind:value={formData.fullName}
                        on:input={() => clearFieldError('fullName')}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.fullName}
                        class:focus:ring-red-500={errors.fullName}
                        class:focus:border-red-500={errors.fullName}
                        placeholder="Enter your full name"
                        required
                    />
                    {#if errors.fullName}
                        <p class="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    {/if}
                </div>

                <!-- Business Name -->
                <div>
                    <label for="businessName" class="block text-sm font-medium text-gray-700">
                        Business Name *
                    </label>
                    <input
                        id="businessName"
                        type="text"
                        bind:value={formData.businessName}
                        on:input={() => clearFieldError('businessName')}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.businessName}
                        class:focus:ring-red-500={errors.businessName}
                        class:focus:border-red-500={errors.businessName}
                        placeholder="Enter your business name"
                        required
                    />
                    {#if errors.businessName}
                        <p class="mt-1 text-sm text-red-600">{errors.businessName}</p>
                    {/if}
                </div>

                <!-- Phone -->
                <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700">
                        Phone Number *
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        bind:value={formData.phone}
                        on:input={handlePhoneInput}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.phone}
                        class:focus:ring-red-500={errors.phone}
                        class:focus:border-red-500={errors.phone}
                        placeholder="Enter 10-digit phone number"
                        required
                    />
                    {#if errors.phone}
                        <p class="mt-1 text-sm text-red-600">{errors.phone}</p>
                    {/if}
                </div>

                <!-- Address -->
                <div>
                    <label for="address" class="block text-sm font-medium text-gray-700">
                        Address *
                    </label>
                    <textarea
                        id="address"
                        bind:value={formData.address}
                        on:input={() => clearFieldError('address')}
                        rows="3"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.address}
                        class:focus:ring-red-500={errors.address}
                        class:focus:border-red-500={errors.address}
                        placeholder="Enter your complete address"
                        required
                    ></textarea>
                    {#if errors.address}
                        <p class="mt-1 text-sm text-red-600">{errors.address}</p>
                    {/if}
                </div>

                <!-- City and State -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="city" class="block text-sm font-medium text-gray-700">
                            City *
                        </label>
                        <input
                            id="city"
                            type="text"
                            bind:value={formData.city}
                            on:input={() => clearFieldError('city')}
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            class:border-red-300={errors.city}
                            class:focus:ring-red-500={errors.city}
                            class:focus:border-red-500={errors.city}
                            placeholder="City"
                            required
                        />
                        {#if errors.city}
                            <p class="mt-1 text-sm text-red-600">{errors.city}</p>
                        {/if}
                    </div>

                    <div>
                        <label for="state" class="block text-sm font-medium text-gray-700">
                            State *
                        </label>
                        <input
                            id="state"
                            type="text"
                            bind:value={formData.state}
                            on:input={() => clearFieldError('state')}
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            class:border-red-300={errors.state}
                            class:focus:ring-red-500={errors.state}
                            class:focus:border-red-500={errors.state}
                            placeholder="State"
                            required
                        />
                        {#if errors.state}
                            <p class="mt-1 text-sm text-red-600">{errors.state}</p>
                        {/if}
                    </div>
                </div>

                <!-- Pincode -->
                <div>
                    <label for="pincode" class="block text-sm font-medium text-gray-700">
                        Pincode *
                    </label>
                    <input
                        id="pincode"
                        type="text"
                        bind:value={formData.pincode}
                        on:input={handlePincodeInput}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        class:border-red-300={errors.pincode}
                        class:focus:ring-red-500={errors.pincode}
                        class:focus:border-red-500={errors.pincode}
                        placeholder="Enter 6-digit pincode"
                        required
                    />
                    {#if errors.pincode}
                        <p class="mt-1 text-sm text-red-600">{errors.pincode}</p>
                    {/if}
                </div>

                <!-- Terms and Conditions -->
                <div class="flex items-center">
                    <input
                        id="agreeToTerms"
                        type="checkbox"
                        bind:checked={formData.agreeToTerms}
                        on:change={() => clearFieldError('agreeToTerms')}
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        class:border-red-300={errors.agreeToTerms}
                        required
                    />
                    <label for="agreeToTerms" class="ml-2 block text-sm text-gray-900">
                        I agree to the 
                        <a href="/terms" class="text-blue-600 hover:text-blue-500">Terms and Conditions</a>
                        and 
                        <a href="/privacy" class="text-blue-600 hover:text-blue-500">Privacy Policy</a>
                    </label>
                </div>
                {#if errors.agreeToTerms}
                    <p class="mt-1 text-sm text-red-600">{errors.agreeToTerms}</p>
                {/if}
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isSubmitting || $loading}
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {#if isSubmitting || $loading}
                        <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Creating Account...</span>
                    {:else}
                        Create Seller Account
                    {/if}
                </button>
            </div>

            <div class="text-center">
                <p class="text-sm text-gray-600">
                    Already have an account?
                    <a href="/seller/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
                        Sign in here
                    </a>
                </p>
            </div>
        </form>
    </div>
</div>

<style>
    .text-green-600 {
        color: #059669;
    }
</style>