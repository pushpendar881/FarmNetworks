// NEW: Get user statistics (for admin dashboard)
import { writable, derived } from 'svelte/store'
import { supabase, authHelpers} from '$lib/supabase.js'
import { browser } from '$app/environment'

// Auth state stores
export const user = writable(null)
export const session = writable(null)
export const loading = writable(true)

// Derived stores
export const isAuthenticated = derived(user, ($user) => !!$user)
export const userType = derived(user, ($user) => $user?.user_metadata?.user_type || 'user')
export const isAdmin = derived(userType, ($userType) => $userType === 'admin')
export const isSeller = derived(userType, ($userType) => $userType === 'seller')
export const isUser = derived(userType, ($userType) => $userType === 'user')

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
        // console.log('Auth state changed:', event)
        
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
      const normalizedEmail = email.trim().toLowerCase();
      
      console.log('🔐 Attempting login...');
      console.log('Email (normalized):', normalizedEmail);
      
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
      const role = authUser?.user_metadata?.user_type || 'user';
      
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

  // Check if user exists in user_profiles table
  checkUserExists: async (email) => {
    if (!supabase) return { exists: false, message: 'Supabase not initialized' };
    
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('🔍 Checking if user exists:', normalizedEmail);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email, role')
        .eq('email', normalizedEmail)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user:', error);
        return { exists: false, message: 'Error checking user existence' };
      }
      
      return { 
        exists: !!data, 
        role: data?.role,
        message: data ? `User found with role: ${data.role}` : 'No user found with this email' 
      };
    } catch (err) {
      console.error('Error checking user:', err);
      return { exists: false, message: 'Error checking user existence' };
    }
  },

  // Signup User (regular user)
  signupUser: async (formData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      console.log('👤 Creating user account:', formData.email);
      
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
            user_type: 'user',
            full_name: formData.fullName,
            phone: formData.phone || '',
            username: formData.username || ''
          }
        }
      });
  
      console.log('User signup response:', { 
        hasUser: !!data?.user,
        needsConfirmation: !data?.session,
        error: error?.message 
      });
  
      if (error) {
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
        needsConfirmation: !data?.session
      };
    } catch (err) {
      console.error('User signup error:', err);
      return { success: false, error: err.message };
    } finally {
      loading.set(false);
    }
  },

  // Signup Seller
  signupSeller: async (formData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      console.log('👤 Creating seller account:', formData.email);
      
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
            username: formData.username || ''
          }
        }
      });
  
      console.log('Seller signup response:', { 
        hasUser: !!data?.user,
        needsConfirmation: !data?.session,
        error: error?.message 
      });
  
      if (error) {
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
        needsConfirmation: !data?.session
      };
    } catch (err) {
      console.error('Seller signup error:', err);
      return { success: false, error: err.message };
    } finally {
      loading.set(false);
    }
  },

  // Signup Admin
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
            full_name: formData.fullName,
            phone: formData.phone || '',
            username: formData.username || ''
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

  // Sign Out (unchanged)
  signOut: async () => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    loading.set(true);
    try {
      console.log('👋 Signing out...');
      
      session.set(null);
      user.set(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      if (browser) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        sessionStorage.clear();
        localStorage.removeItem('user-preferences');
        localStorage.removeItem('dashboard-data');
        
        const clearAllCookies = () => {
          const cookies = document.cookie.split(';');
          cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name.includes('supabase') || 
                name.includes('auth') || 
                name.includes('session') || 
                name.includes('token') ||
                name.includes('sb-')) {
              
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
              
              const domainParts = window.location.hostname.split('.');
              if (domainParts.length > 1) {
                const rootDomain = domainParts.slice(-2).join('.');
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
              }
            }
          });
        };
        
        clearAllCookies();
        
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
      console.log('✅ Signed out successfully and cleared all data');
      return { success: true };
      
    } catch (err) {
      console.error('Sign out error:', err);
      
      session.set(null);
      user.set(null);
      
      if (browser) {
        localStorage.clear();
        sessionStorage.clear();
        
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

  // Get current user profile - Updated to match schema
  getCurrentUserProfile: async () => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Get user profile from user_profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        // If no profile exists, create one based on auth metadata
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          username: user.user_metadata?.username || null,
          phone: user.user_metadata?.phone || null,
          role: user.user_metadata?.user_type || 'user',
          is_active: true,
          is_verified: user.email_confirmed_at ? true : false
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();
          
        if (createError) {
          return { success: false, error: createError.message };
        }
        
        return { success: true, profile: createdProfile, userType: createdProfile.role };
      }

      const userType = userProfile.role;
      
      // If user is admin, get admin profile
      if (userType === 'admin') {
        const { data: adminProfile, error: adminError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (adminError) {
          // Create admin profile if it doesn't exist
          const newAdminProfile = {
            id: user.id,
            department: null,
            permissions: {
              "users": true,
              "devices": true,
              "sellers": true,
              "gateways": true,
              "analytics": true,
              "dashboard": true,
              "subscriptions": true
            },
            access_level: 'full'
          };
          
          const { data: createdAdminProfile, error: createAdminError } = await supabase
            .from('admin_profiles')
            .insert([newAdminProfile])
            .select()
            .single();
            
          if (createAdminError) {
            return { success: false, error: createAdminError.message };
          }
          
          return { 
            success: true, 
            profile: { ...userProfile, ...createdAdminProfile }, 
            userType: 'admin' 
          };
        }
        
        return { 
          success: true, 
          profile: { ...userProfile, ...adminProfile }, 
          userType: 'admin' 
        };
      } 
      // If user is seller, get seller profile
      else if (userType === 'seller') {
        const { data: sellerProfile, error: sellerError } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (sellerError) {
          // Create seller profile if it doesn't exist
          const newSellerProfile = {
            id: user.id,
            business_name: user.user_metadata?.business_name || '',
            business_type: null,
            address: null,
            city: null,
            state: null,
            pincode: null,
            gstin: null,
            commission_rate: 10.00,
            total_sales: 0.00,
            rating: 0.00,
            created_by: null,
            approved_by: null,
            approved_at: null
          };
          
          const { data: createdSellerProfile, error: createSellerError } = await supabase
            .from('seller_profiles')
            .insert([newSellerProfile])
            .select()
            .single();
            
          if (createSellerError) {
            return { success: false, error: createSellerError.message };
          }
          
          return { 
            success: true, 
            profile: { ...userProfile, ...createdSellerProfile }, 
            userType: 'seller' 
          };
        }
        
        return { 
          success: true, 
          profile: { ...userProfile, ...sellerProfile }, 
          userType: 'seller' 
        };
      }
      
      // Regular user
      return { success: true, profile: userProfile, userType: 'user' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get seller profile by ID - Updated to match schema
  getSellerProfile: async (sellerId) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', sellerId)
        .eq('role', 'seller')
        .single();
        
      if (userError) {
        return { success: false, error: userError.message };
      }
      
      const { data: sellerProfile, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('id', sellerId)
        .single();
        
      if (sellerError) {
        return { success: false, error: sellerError.message };
      }
      
      const combinedProfile = {
        ...userProfile,
        ...sellerProfile
      };
      
      return { success: true, profile: combinedProfile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get all seller profiles - Updated to match schema
  getAllSellerProfiles: async (options = {}) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;
      
      let query = supabase
        .from('user_profiles')
        .select(`
          *,
          seller_profiles (*)
        `, { count: 'exact' })
        .eq('role', 'seller');
      
      // Add search filter
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      // Add status filter
      if (status !== 'all') {
        query = query.eq('is_active', status === 'active');
      }
      
      // Add sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Add pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Transform the data to flatten the nested seller_profiles
      const transformedData = data.map(item => ({
        ...item,
        ...(item.seller_profiles || {}),
        seller_profiles: undefined
      }));
      
      return { 
        success: true, 
        sellers: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get seller statistics - Updated to match schema
  getSellerStatistics: async () => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { count: totalSellers, error: countError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'seller');
        
      if (countError) {
        return { success: false, error: countError.message };
      }
      
      const { count: activeSellers, error: activeError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'seller')
        .eq('is_active', true);
        
      if (activeError) {
        return { success: false, error: activeError.message };
      }
      
      const { data: salesData, error: salesError } = await supabase
        .from('seller_profiles')
        .select('total_sales');
        
      if (salesError) {
        return { success: false, error: salesError.message };
      }
      
      const totalSales = salesData.reduce((sum, seller) => sum + (seller.total_sales || 0), 0);
      
      const { data: ratingData, error: ratingError } = await supabase
        .from('seller_profiles')
        .select('rating');
        
      if (ratingError) {
        return { success: false, error: ratingError.message };
      }
      
      const validRatings = ratingData.filter(seller => seller.rating > 0);
      const averageRating = validRatings.length > 0 
        ? validRatings.reduce((sum, seller) => sum + seller.rating, 0) / validRatings.length 
        : 0;
      
      return {
        success: true,
        statistics: {
          totalSellers: totalSellers || 0,
          activeSellers: activeSellers || 0,
          inactiveSellers: (totalSellers || 0) - (activeSellers || 0),
          totalSales: totalSales,
          averageRating: Math.round(averageRating * 100) / 100
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update seller profile - Updated to match schema
  updateSellerProfile: async (sellerId, updateData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      console.log('Updating seller profile for:', sellerId);
      
      // First, check current user and permissions
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }
      console.log('Current user ID:', user.id);
      console.log('Updating seller ID:', sellerId);
      
      // Update user_profiles table first
      const userUpdateData = {
        full_name: updateData.full_name,
        username: updateData.username,
        phone: updateData.phone,
        is_active: updateData.is_active,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined/null values
      Object.keys(userUpdateData).forEach(key => {
        if (userUpdateData[key] === undefined || userUpdateData[key] === null) {
          delete userUpdateData[key];
        }
      });
      
      if (Object.keys(userUpdateData).length > 1) {
        const { error: userError } = await supabase
          .from('user_profiles')
          .update(userUpdateData)
          .eq('id', sellerId);
          
        if (userError) {
          console.error('User update error:', userError);
          return { success: false, error: userError.message };
        }
      }
      
      // Prepare seller update data
      const sellerUpdateData = {
        business_name: updateData.business_name,
        business_type: updateData.business_type,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        gstin: updateData.gstin,
        commission_rate: updateData.commission_rate ? parseFloat(updateData.commission_rate) : undefined,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined/null values
      Object.keys(sellerUpdateData).forEach(key => {
        if (sellerUpdateData[key] === undefined || sellerUpdateData[key] === null) {
          delete sellerUpdateData[key];
        }
      });
      
      console.log('Seller update data:', sellerUpdateData);
      
      if (Object.keys(sellerUpdateData).length > 1) {
        // Method 1: Use count to verify rows were actually updated
        const { data, error: sellerError, count } = await supabase
          .from('seller_profiles')
          .update(sellerUpdateData)
          .eq('id', sellerId)
          .select('*', { count: 'exact' });
          
        if (sellerError) {
          console.error('Seller update error:', sellerError);
          return { success: false, error: `Seller update failed: ${sellerError.message}` };
        }
        
        console.log('Update result count:', count);
        console.log('Update result data:', data);
        
        // Check if any rows were actually updated
        if (count === 0) {
          return { 
            success: false, 
            error: 'No rows were updated. This might be due to RLS policies or the seller not existing.' 
          };
        }
        
        console.log(`✅ Successfully updated ${count} seller profile(s)`);
      }
      
      return { success: true, message: 'Seller profile updated successfully' };
      
    } catch (err) {
      console.error('Catch block error:', err);
      return { success: false, error: err.message };
    }
  },
  
  // Approve/Reject seller - Updated to match schema
  approveSeller: async (sellerId, approved, adminId) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      // Update user_profiles table
      const { error: userError } = await supabase
        .from('user_profiles')
        .update({
          is_active: approved,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellerId);
        
      if (userError) {
        return { success: false, error: userError.message };
      }
      
      // Update seller_profiles table
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (approved) {
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .update(updateData)
        .eq('id', sellerId);
        
      if (sellerError) {
        return { success: false, error: sellerError.message };
      }
      
      return { 
        success: true, 
        message: approved ? 'Seller approved successfully' : 'Seller rejected successfully' 
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // NEW: Get all users (for admin)
  getAllUsers: async (options = {}) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        role = 'all',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;
      
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });
      
      // Add role filter
      if (role !== 'all') {
        query = query.eq('role', role);
      }
      
      // Add search filter
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
      }
      
      // Add status filter
      if (status !== 'all') {
        query = query.eq('is_active', status === 'active');
      }
      
      // Add sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Add pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        users: data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
getUserStatistics: async () => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  
  try {
    // Get total users count
    const { count: totalUsers, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      return { success: false, error: countError.message };
    }
    
    // Get active users count
    const { count: activeUsers, error: activeError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
      
    if (activeError) {
      return { success: false, error: activeError.message };
    }
    
    // Get users by role
    const { count: regularUsers, error: regularError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');
      
    if (regularError) {
      return { success: false, error: regularError.message };
    }
    
    const { count: sellers, error: sellersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'seller');
      
    if (sellersError) {
      return { success: false, error: sellersError.message };
    }
    
    const { count: admins, error: adminsError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
      
    if (adminsError) {
      return { success: false, error: adminsError.message };
    }
    
    // Get verified users count
    const { count: verifiedUsers, error: verifiedError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);
      
    if (verifiedError) {
      return { success: false, error: verifiedError.message };
    }
    
    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentUsers, error: recentError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());
      
    if (recentError) {
      return { success: false, error: recentError.message };
    }
    
    return {
      success: true,
      statistics: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
        verifiedUsers: verifiedUsers || 0,
        unverifiedUsers: (totalUsers || 0) - (verifiedUsers || 0),
        recentUsers: recentUsers || 0,
        usersByRole: {
          users: regularUsers || 0,
          sellers: sellers || 0,
          admins: admins || 0
        }
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
},

// NEW: Update user profile (for admin)
updateUserProfile: async (userId, updateData) => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, message: 'User profile updated successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
},

// NEW: Delete user (for admin)
deleteUser: async (userId) => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  
  try {
    // First delete from specific role tables if needed
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    // Delete from role-specific tables
    if (userProfile.role === 'seller') {
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .delete()
        .eq('id', userId);
        
      if (sellerError) {
        return { success: false, error: sellerError.message };
      }
    } else if (userProfile.role === 'admin') {
      const { error: adminError } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', userId);
        
      if (adminError) {
        return { success: false, error: adminError.message };
      }
    }
    
    // Delete from user_profiles
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);
      
    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
    
    // Delete from auth.users (this requires admin privileges)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.warn('Could not delete from auth.users:', authError.message);
      // Continue anyway as profile deletion was successful
    }
    
    return { success: true, message: 'User deleted successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
},

// NEW: Toggle user status (activate/deactivate)
toggleUserStatus: async (userId, isActive) => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
}