import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase.js';
import { browser } from '$app/environment';

// Admin auth state stores
export const adminUser = writable(null);
export const adminSession = writable(null);
export const adminLoading = writable(true);

// Derived stores
export const isAdminAuthenticated = derived(adminUser, ($adminUser) => !!$adminUser);

// Initialize admin auth state
export const initializeAdminAuth = async () => {
  if (!browser || !supabase) return;
  
  adminLoading.set(true);
  
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession) {
      // Check if the user has an admin profile
      const { data: adminProfile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (adminProfile && !error) {
        adminSession.set(currentSession);
        adminUser.set({
          ...currentSession.user,
          adminProfile
        });
      } else {
        // User exists but no admin profile, clear session
        await supabase.auth.signOut();
        adminSession.set(null);
        adminUser.set(null);
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (currentSession) {
          // Check if the user has an admin profile
          const { data: adminProfile, error } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (adminProfile && !error) {
            adminSession.set(currentSession);
            adminUser.set({
              ...currentSession.user,
              adminProfile
            });
          } else {
            // User exists but no admin profile, clear session
            await supabase.auth.signOut();
            adminSession.set(null);
            adminUser.set(null);
          }
        } else {
          adminSession.set(null);
          adminUser.set(null);
        }
        adminLoading.set(false);
      }
    );

    return () => subscription.unsubscribe();
  } catch (error) {
    console.error('Error initializing admin auth:', error);
  } finally {
    adminLoading.set(false);
  }
};

// Admin authentication store
export const adminAuthStore = {
  // Initialize admin authentication
  initializeAdminAuth: async () => {
    if (!browser || !supabase) return;
    
    adminLoading.set(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        // Check if the user has an admin profile
        const { data: adminProfile, error } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (adminProfile && !error) {
          adminSession.set(currentSession);
          adminUser.set({
            ...currentSession.user,
            adminProfile
          });
        } else {
          // User exists but no admin profile, clear session
          await supabase.auth.signOut();
          adminSession.set(null);
          adminUser.set(null);
        }
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (currentSession) {
            // Check if the user has an admin profile
            const { data: adminProfile, error } = await supabase
              .from('admin_profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            if (adminProfile && !error) {
              adminSession.set(currentSession);
              adminUser.set({
                ...currentSession.user,
                adminProfile
              });
            } else {
              // User exists but no admin profile, clear session
              await supabase.auth.signOut();
              adminSession.set(null);
              adminUser.set(null);
            }
          } else {
            adminSession.set(null);
            adminUser.set(null);
          }
          adminLoading.set(false);
        }
      );

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing admin auth:', error);
    } finally {
      adminLoading.set(false);
    }
  },

  // Admin Sign In
  adminSignIn: async (email, password) => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    // Client-side validation
    if (!email || !email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    
    if (!password || password.length < 6) {
      return { success: false, error: 'Password is required' };
    }
    
    adminLoading.set(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

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
      
      // Check if user has admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (adminError || !adminProfile) {
        // User exists but no admin profile
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Access denied. Admin privileges required.',
          code: 'NOT_ADMIN'
        };
      }

      // Check if admin is blocked in user_profiles (if they also have a user profile)
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('is_blocked')
        .eq('id', authUser.id)
        .single();

      if (userProfileData?.is_blocked) {
        await supabase.auth.signOut();
        return { success: false, error: 'Your admin account has been blocked.' };
      }
      
      return { 
        success: true, 
        user: {
          ...authUser,
          adminProfile
        }
      };
    } catch (err) {
      console.error('Admin sign in error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      adminLoading.set(false);
    }
  },

  // Admin Sign Out
  adminSignOut: async () => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    adminLoading.set(true);
    try {
      // Clear stores first
      adminSession.set(null);
      adminUser.set(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Admin sign out error:', error);
        return { success: false, error: error.message };
      }
      
      if (browser) {
        // Clear storage more selectively
        try {
          // Clear auth-related localStorage items
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Clear auth-related sessionStorage items
          const sessionKeysToRemove = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
              sessionKeysToRemove.push(key);
            }
          }
          sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
          
          // Clear auth cookies
          document.cookie.split(';').forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
          });
        } catch (cleanupError) {
          console.warn('Storage cleanup error:', cleanupError);
        }
        
        // Navigate after a brief delay
        setTimeout(() => {
          window.location.href = '/admin/auth/login';
        }, 100);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Admin sign out error:', err);
      return { success: false, error: 'An error occurred during sign out' };
    } finally {
      adminLoading.set(false);
    }
  },

  // Get current admin user
  getCurrentAdminUser: async () => {
    if (!supabase) return null;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Check if user has admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (adminError || !adminProfile) {
        return null;
      }
      
      return {
        ...user,
        adminProfile
      };
    } catch (err) {
      console.error('Error getting current admin user:', err);
      return null;
    }
  },

  // Create admin profile (for system setup)
  createAdminProfile: async (userId) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .insert([{
          id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, message: 'Admin profile created successfully' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update admin profile
  updateAdminProfile: async (userId, updateData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, message: 'Admin profile updated successfully' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}; 