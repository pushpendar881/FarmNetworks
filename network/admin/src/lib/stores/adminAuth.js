import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase.js';
import { browser } from '$app/environment';

export const adminUser = writable(null);
export const adminSession = writable(null);
export const adminLoading = writable(true);

export const isAdminAuthenticated = derived(adminUser, ($adminUser) => !!$adminUser);

export const adminAuthStore = {
  adminSignIn: async (email, password) => {
    console.log('adminAuthStore.adminSignIn called with:', { email, password: '***' });
    
    if (!supabase) {
      console.error('Supabase client not available');
      return { success: false, error: 'Authentication service not available' };
    }

    if (!email || !email.trim()) {
      console.error('Email is required');
      return { success: false, error: 'Email is required' };
    }

    if (!password || password.length < 6) {
      console.error('Password is required or too short');
      return { success: false, error: 'Password is required' };
    }

    adminLoading.set(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting Supabase admin signIn with:', normalizedEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      
      console.log('Supabase admin signIn response:', { data, error });

      if (error) {
        switch (error.message) {
          case 'Invalid login credentials':
            return {
              success: false,
              error: 'Invalid email or password.',
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
      console.log('Admin user authenticated:', authUser);

      // Skip admin profile check for now to test basic login
      // const { data: adminProfile, error: adminError } = await supabase
      //   .from('admin_profiles')
      //   .select('*')
      //   .eq('id', authUser.id)
      //   .single();

      // if (adminError || !adminProfile) {
      //   return {
      //     success: false,
      //     error: 'Access denied. Admin privileges required.',
      //     code: 'NOT_ADMIN'
      //   };
      // }

      adminSession.set(data.session);
      adminUser.set(authUser);

      console.log('Admin login successful, setting user and session');
      return {
        success: true,
        user: authUser
      };
    } catch (err) {
      console.error('Admin sign in error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      adminLoading.set(false);
    }
  },

  adminSignOut: async () => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };

    adminLoading.set(true);
    try {
      adminSession.set(null);
      adminUser.set(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Admin sign out error:', error);
        return { success: false, error: error.message };
      }

      if (browser) {
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 100);
      }

      return { success: true };
    } catch (err) {
      console.error('Admin sign out error:', err);
      return { success: false, error: 'An error occurred during sign out' };
    } finally {
      adminLoading.set(false);
    }
  }
};