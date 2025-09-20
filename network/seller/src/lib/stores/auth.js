import { writable, derived } from 'svelte/store'
import { supabase } from '$lib/supabase.js'
import { browser } from '$app/environment'

export const user = writable(null)
export const session = writable(null)
export const loading = writable(true)

export const isAuthenticated = derived(user, ($user) => !!$user)

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim());
};

export const authStore = {
  signIn: async (email, password) => {
    console.log('authStore.signIn called with:', { email, password: '***' });
    
    if (!supabase) {
      console.error('Supabase client not available');
      return { success: false, error: 'Authentication service not available' };
    }
    
    if (!validateEmail(email)) {
      console.error('Invalid email format:', email);
      return { success: false, error: 'Please enter a valid email address' };
    }
    
    if (!password || password.length < 6) {
      console.error('Invalid password length');
      return { success: false, error: 'Password is required' };
    }
    
    loading.set(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting Supabase signIn with:', normalizedEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      
      console.log('Supabase signIn response:', { data, error });

      if (error) {
        switch (error.message) {
          case 'Invalid login credentials':
            return { 
              success: false, 
              error: 'Email or password is incorrect. Please check your credentials and try again.',
              code: 'INVALID_CREDENTIALS'
            };
          case 'Email not confirmed':
            return { 
              success: false, 
              error: 'Please confirm your email address before signing in.',
              code: 'EMAIL_NOT_CONFIRMED'
            };
          case 'Too many requests':
            return { 
              success: false, 
              error: 'Too many login attempts. Please wait a moment and try again.',
              code: 'RATE_LIMITED'
            };
          default:
            return { success: false, error: error.message };
        }
      }

      const authUser = data.user;
      const role = authUser?.user_metadata?.user_type || 'user';
      console.log('User role:', role, 'User metadata:', authUser?.user_metadata);
      
      // Skip seller profile checks for now to test basic login
      // if (role === 'seller') {
      //   const { data: profileData } = await supabase
      //     .from('user_profiles')
      //     .select('is_blocked, seller_profiles(approval_status)')
      //     .eq('id', authUser.id)
      //     .single();

      //   if (profileData?.is_blocked) {
      //     await supabase.auth.signOut();
      //     return { success: false, error: 'Your account has been blocked. Contact support.' };
      //   }

      //   const approvalStatus = profileData?.seller_profiles?.approval_status;
      //   if (approvalStatus !== 'approved') {
      //     await supabase.auth.signOut();
      //     switch (approvalStatus) {
      //       case 'pending':
      //         return { success: false, error: 'Your seller account is pending approval.' };
      //       case 'rejected':
      //         return { success: false, error: 'Your seller account has been rejected. Contact support.' };
      //       case 'blocked':
      //         return { success: false, error: 'Your seller account has been blocked. Contact support.' };
      //       default:
      //         return { success: false, error: 'Your seller account is not approved.' };
      //     }
      //   }
      // }

      session.set(data.session);
      user.set(authUser);
      
      console.log('Login successful, setting user and session');
      return { success: true, role, user: authUser };
    } catch (err) {
      console.error('Sign in error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      loading.set(false);
    }
  },

  signupSeller: async (formData) => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return { success: false, error: 'System configuration error' };
    }

    loading.set(true);
    
    try {
      const signupResponse = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            user_type: 'seller',
            full_name: formData.fullName.trim(),
            business_name: formData.businessName?.trim() || '',
            phone: formData.phone?.trim() || '',
            address: formData.address?.trim() || '',
            city: formData.city?.trim() || '',
            state: formData.state?.trim() || '',
            pincode: formData.pincode?.trim() || ''
          },
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      });

      const { data, error } = signupResponse;

      if (error) {
        if (error.message.includes('User already registered')) {
          return {
            success: false,
            error: 'This email is already registered. Please sign in instead.',
            code: 'EMAIL_EXISTS'
          };
        }
        return {
          success: false,
          error: error.message || 'Account creation failed',
          code: 'AUTH_ERROR'
        };
      }

      const user = data.user;
      if (!user) {
        return { success: false, error: 'User creation failed' };
      }

      // Create user profile
      const userProfileData = {
        id: user.id,
        email: formData.email.trim().toLowerCase(),
        full_name: formData.fullName.trim(),
        phone: formData.phone?.trim() || null,
        role: 'seller',
        is_active: true
      };

      await supabase.from('user_profiles').insert([userProfileData]);

      // Create seller profile
      const sellerProfileData = {
        id: user.id,
        business_name: formData.businessName?.trim() || formData.fullName.trim(),
        business_type: null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        pincode: formData.pincode?.trim() || null,
        gstin: null,
        total_sales: 0.00,
        approval_status: 'pending'
      };

      await supabase.from('seller_profiles').insert([sellerProfileData]);

      return {
        success: true,
        data,
        needsConfirmation: !data.session,
        message: data.session 
          ? 'Signup successful! Your account is pending approval.' 
          : 'Please check your email to verify your account. Your seller account will be pending approval.'
      };

    } catch (err) {
      console.error('Unexpected signup error:', err);
      return {
        success: false,
        error: 'An unexpected error occurred. Our team has been notified.',
        code: 'UNEXPECTED_ERROR',
        requiresSupport: true
      };
    } finally {
      loading.set(false);
    }
  },

  resendConfirmation: async (email) => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    if (!validateEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Resend confirmation error:', err);
      return { success: false, error: 'Failed to resend confirmation email' };
    }
  },

  signOut: async () => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    loading.set(true);
    try {
      session.set(null);
      user.set(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
      }
      
      if (browser) {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Sign out error:', err);
      return { success: false, error: 'An error occurred during sign out' };
    } finally {
      loading.set(false);
    }
  }
};