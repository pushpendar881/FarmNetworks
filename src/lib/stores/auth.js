// src/lib/stores/auth.js (fixed version)
import { writable, derived } from 'svelte/store'
import { supabase, authHelpers, PUBLIC_SUPABASE_URL } from '$lib/supabase.js'
import { browser } from '$app/environment'

// Auth state stores
export const user = writable(null)
export const session = writable(null)
export const loading = writable(true)

// Derived stores
export const isAuthenticated = derived(user, ($user) => !!$user)
export const userType = derived(user, ($user) => $user?.user_metadata?.user_type || 'seller')
export const isAdmin = derived(userType, ($userType) => $userType === 'admin')
export const isSeller = derived(userType, ($userType) => $userType === 'seller')

// Initialize auth state
export const initializeAuth = async () => {
  if (!browser || !supabase) return;
  
  loading.set(true)
  
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    
    if (currentSession) {
      session.set(currentSession)
      user.set(currentSession.user)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event)
        
        if (currentSession) {
          session.set(currentSession)
          user.set(currentSession.user)
        } else {
          session.set(null)
          user.set(null)
        }
        
        loading.set(false)
      }
    )

    // Return cleanup function
    return () => subscription.unsubscribe()
  } catch (error) {
    console.error('Error initializing auth:', error)
  } finally {
    loading.set(false)
  }
}

export const authStore = {
  // Enhanced Sign In with better error handling
  signIn: async (email, password) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      // Normalize email input
      const normalizedEmail = email.trim().toLowerCase();
      
      console.log('🔐 Attempting login...');
      console.log('Email (normalized):', normalizedEmail);
      console.log('Password length:', password.length);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      console.log('📡 Auth Response:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Auth Error:', error);
        
        // Handle specific error types
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
              code: 'EMAIL_NOT_CONFIRMED',
              needsConfirmation: true 
            };
          case 'Too many requests':
            return { 
              success: false, 
              error: 'Too many login attempts. Please wait a moment and try again.',
              code: 'RATE_LIMITED'
            };
          default:
            return { success: false, error: error.message, code: 'UNKNOWN' };
        }
      }

      const authUser = data.user;
      const role = authUser?.user_metadata?.user_type || 'unknown';
      
      console.log('✅ Login successful!');
      console.log('User role:', role);
      console.log('User ID:', authUser.id);
      
      return { success: true, role, user: authUser };
    } catch (err) {
      console.error('💥 Unexpected error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.', code: 'NETWORK_ERROR' };
    } finally {
      loading.set(false);
    }
  },

  // Debug function to check if user exists
  checkUserExists: async (email) => {
    if (!supabase) return { exists: false, message: 'Supabase not initialized' };
    
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('🔍 Checking if user exists:', normalizedEmail);
      
      // Check if user exists in seller_profiles table
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('email')
        .eq('email', normalizedEmail)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking user:', error);
        return { exists: false, message: 'Error checking user existence' };
      }
      
      return { 
        exists: !!data, 
        message: data ? 'User found in database' : 'No user found with this email' 
      };
    } catch (err) {
      console.error('Error checking user:', err);
      return { exists: false, message: 'Error checking user existence' };
    }
  },

  // Signup Seller (with user_type: 'seller')
  signupSeller: async (formData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      console.log('👤 Creating seller account:', formData.email);
      
      // Validate required fields
      if (!formData.email || !formData.password || !formData.fullName) {
        return { 
          success: false, 
          error: 'Email, password, and full name are required' 
        };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            user_type: 'seller',
            full_name: formData.fullName,
            business_name: formData.businessName || '',
            phone: formData.phone || '',
            address: formData.address || '',
            city: formData.city || '',
            state: formData.state || '',
            pincode: formData.pincode || ''
          }
        }
      });
  
      console.log('Seller signup response:', { 
        hasUser: !!data?.user,
        needsConfirmation: !data?.session,
        error: error?.message 
      });
  
      if (error) {
        // Handle specific signup errors
        if (error.message.includes('User already registered')) {
          return { 
            success: false, 
            error: 'An account with this email already exists. Please sign in instead.' 
          };
        }
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        data,
        needsConfirmation: !data?.session // User needs to confirm email if no session
      };
    } catch (err) {
      console.error('Seller signup error:', err);
      return { success: false, error: err.message };
    } finally {
      loading.set(false);
    }
  },

  // Signup Admin (with user_type: 'admin')
  signupAdmin: async (formData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      console.log('👑 Creating admin account:', formData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            user_type: 'admin',
            full_name: formData.fullName
          }
        }
      });
  
      console.log('Admin signup response:', { 
        hasUser: !!data?.user,
        error: error?.message 
      });
  
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      loading.set(false);
    }
  },

  // Sign Out
  signOut: async () => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      console.log('👋 Signing out...');
      
      // Clear local state first
      session.set(null);
      user.set(null);
      
      // Sign out from Supabase (this will clear auth cookies)
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, we still want to clear local state
        // So we'll continue with cleanup
      }
      
      // Clear any additional browser storage if needed
      if (browser) {
        // Clear all Supabase-related localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log('Removed localStorage key:', key);
        });
        
        // Clear sessionStorage completely
        sessionStorage.clear();
        
        // Clear any custom app data
        localStorage.removeItem('user-preferences');
        localStorage.removeItem('dashboard-data');
        
        // Clear all cookies related to Supabase
        const clearAllCookies = () => {
          const cookies = document.cookie.split(';');
          cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // Remove cookies that might be related to auth or Supabase
            if (name.includes('supabase') || 
                name.includes('auth') || 
                name.includes('session') || 
                name.includes('token') ||
                name.includes('sb-')) {
              
              // Remove cookie for current domain
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              
              // Also try to remove for subdomain
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
              
              // And for root domain
              const domainParts = window.location.hostname.split('.');
              if (domainParts.length > 1) {
                const rootDomain = domainParts.slice(-2).join('.');
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
              }
              
              console.log('Removed cookie:', name);
            }
          });
        };
        
        clearAllCookies();
        
        // Force clear any remaining auth state by reloading the page
        // This ensures all auth state is completely cleared
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
      console.log('✅ Signed out successfully and cleared all data');
      return { success: true };
      
    } catch (err) {
      console.error('Sign out error:', err);
      
      // Even on error, clear local state
      session.set(null);
      user.set(null);
      
      // Clear browser storage anyway
      if (browser) {
        // Clear all localStorage items
        localStorage.clear();
        sessionStorage.clear();
        
        // Force redirect to home page
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
      return { success: false, error: err.message };
    } finally {
      loading.set(false);
    }
  },

  // Reset Password
  resetPassword: async (email) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(), 
        {
          redirectTo: `${window.location.origin}/reset`
        }
      );
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Resend confirmation email
  resendConfirmation: async (email) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/confirm`
        }
      });
      if (error) return { success: false, error: error.message };
      return { success: true, message: 'Confirmation email sent!' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get current user profile
  getCurrentUserProfile: async () => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { success: false, error: 'No authenticated user' };
      }

      const userType = user.user_metadata?.user_type;
      
      if (userType === 'admin') {
        const { data, error: profileError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          return { success: false, error: profileError.message };
        }
        
        return { success: true, profile: data, userType: 'admin' };
      } else {
        const { data, error: profileError } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          return { success: false, error: profileError.message };
        }
        
        return { success: true, profile: data, userType: 'seller' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};