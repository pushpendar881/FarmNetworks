import { writable, derived } from 'svelte/store'
import { supabase } from '$lib/supabase.js'
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

    return () => subscription.unsubscribe()
  } catch (error) {
    console.error('Error initializing auth:', error)
  } finally {
    loading.set(false)
  }
}

// Enhanced validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim());
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    };
  }
  
  return { valid: true };
};

const validatePhone = (phone) => {
  const cleanPhone = phone?.replace(/\D/g, '');
  return cleanPhone && cleanPhone.length === 10;
};

const validatePincode = (pincode) => {
  return /^\d{6}$/.test(pincode);
};

export const authStore = {
  // Initialize authentication
  initializeAuth: async () => {
    if (!browser || !supabase) return;
    
    loading.set(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        session.set(currentSession);
        user.set(currentSession.user);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (currentSession) {
            session.set(currentSession);
            user.set(currentSession.user);
          } else {
            session.set(null);
            user.set(null);
          }
          loading.set(false);
        }
      );

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      loading.set(false);
    }
  },

  // Enhanced Sign In
  signIn: async (email, password) => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    // Client-side validation
    if (!validateEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    
    if (!password || password.length < 6) {
      return { success: false, error: 'Password is required' };
    }
    
    loading.set(true);
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
      
      return { success: true, role, user: authUser };
    } catch (err) {
      console.error('Sign in error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      loading.set(false);
    }
  },

  // Enhanced Signup Seller with comprehensive validation and dual-table storage
  // signupSeller: async (formData) => {
  //   if (!supabase) {
  //     console.error('Supabase client not initialized');
  //     return { success: false, error: 'System configuration error' };
  //   }

  //   loading.set(true);
    
  //   try {
  //     console.log('👤 Creating seller account:', formData.email);

  //     // Main signup call with timeout fallback
  //     let signupResponse;
  //     try {
  //       signupResponse = await Promise.race([
  //         supabase.auth.signUp({
  //           email: formData.email.trim().toLowerCase(),
  //           password: formData.password,
  //           options: {
  //             data: {
  //               user_type: 'seller',
  //               full_name: formData.fullName.trim(),
  //               business_name: formData.businessName?.trim() || '',
  //               phone: formData.phone?.trim() || '',
  //               address: formData.address?.trim() || '',
  //               city: formData.city?.trim() || '',
  //               state: formData.state?.trim() || '',
  //               pincode: formData.pincode?.trim() || ''
  //             },
  //             emailRedirectTo: `${window.location.origin}seller/auth/login`
  //           }
  //         }),
  //         new Promise((_, reject) => 
  //           setTimeout(() => reject(new Error('Signup timeout')), 10000)
  //         )
  //       ]);
  //     } catch (timeoutError) {
  //       console.error('Signup timeout:', timeoutError);
  //       return {
  //         success: false,
  //         error: 'Signup process took too long. Please try again.'
  //       };
  //     }

  //     const { data, error } = signupResponse;
  //     console.log('Seller signup response:', { 
  //       userId: data?.user?.id,
  //       needsConfirmation: !data?.session,
  //       error: error?.message 
  //     });

  //     // Handle known error cases
  //     if (error) {
  //       if (error.message.includes('User already registered')) {
  //         return {
  //           success: false,
  //           error: 'This email is already registered. Please sign in instead.',
  //           code: 'EMAIL_EXISTS'
  //         };
  //       }
  //       if (error.message.includes('duplicates')) {
  //         return {
  //           success: false,
  //           error: 'Account creation failed due to system error. Our team has been notified.',
  //           code: 'AUTH_SYSTEM_ERROR',
  //           requiresSupport: true
  //         };
  //       }
  //       return {
  //         success: false,
  //         error: error.message || 'Account creation failed',
  //         code: 'AUTH_ERROR'
  //       };
  //     }

  //     // If signup successful and we have a user, create profiles in both tables
  //     if (data?.user) {
  //       const userId = data.user.id;
        
  //       try {
  //         // Create user_profile record
  //         const userProfileData = {
  //           id: userId,
  //           email: formData.email.trim().toLowerCase(),
  //           full_name: formData.fullName.trim(),
  //           phone: formData.phone?.trim() || null,
  //           role: 'seller',
  //           is_active: true
  //         };

  //         const { error: userProfileError } = await supabase
  //           .from('user_profiles')
  //           .insert([userProfileData]);

  //         if (userProfileError) {
  //           console.error('Error creating user profile:', userProfileError);
  //           // Don't fail the signup, but log the error
  //         }

  //         // Create seller_profile record
  //         const sellerProfileData = {
  //           id: userId,
  //           business_name: formData.businessName?.trim() || '',
  //           business_type: null,
  //           address: formData.address?.trim() || null,
  //           city: formData.city?.trim() || null,
  //           state: formData.state?.trim() || null,
  //           pincode: formData.pincode?.trim() || null,
  //           gstin: null,
  //           total_sales: 0.00,
  //           is_approved: false
  //         };

  //         const { error: sellerProfileError } = await supabase
  //           .from('seller_profiles')
  //           .insert([sellerProfileData]);

  //         if (sellerProfileError) {
  //           console.error('Error creating seller profile:', sellerProfileError);
  //           // Don't fail the signup, but log the error
  //         }

  //         console.log('✅ Seller profiles created successfully for user:', userId);
  //       } catch (profileError) {
  //         console.error('Error creating profiles:', profileError);
  //         // Don't fail the signup, but log the error
  //       }
  //     }

  //     return {
  //       success: true,
  //       data,
  //       needsConfirmation: !data.session,
  //       message: data.session 
  //         ? 'Signup successful! Redirecting...' 
  //         : 'Please check your email to verify your account.'
  //     };

  //   } catch (err) {
  //     console.error('Unexpected signup error:', err);
  //     return {
  //       success: false,
  //       error: 'An unexpected error occurred. Our team has been notified.',
  //       code: 'UNEXPECTED_ERROR',
  //       requiresSupport: true
  //     };
  //   } finally {
  //     loading.set(false);
  //   }
  // },
  // Replace your existing signupSeller function with this:

signupSeller: async (formData) => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { success: false, error: 'System configuration error' };
  }

  loading.set(true);
  
  try {
    console.log('👤 Creating seller account:', formData.email);

    // Step 1: Create auth user with timeout fallback
    let signupResponse;
    try {
      signupResponse = await Promise.race([
        supabase.auth.signUp({
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
            emailRedirectTo: `${window.location.origin}/seller/auth/login`
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Signup timeout')), 10000)
        )
      ]);
    } catch (timeoutError) {
      console.error('Signup timeout:', timeoutError);
      return {
        success: false,
        error: 'Signup process took too long. Please try again.'
      };
    }

    const { data, error } = signupResponse;
    console.log('Seller signup response:', { 
      userId: data?.user?.id,
      needsConfirmation: !data?.session,
      error: error?.message 
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return {
          success: false,
          error: 'This email is already registered. Please sign in instead.',
          code: 'EMAIL_EXISTS'
        };
      }
      if (error.message.includes('duplicates')) {
        return {
          success: false,
          error: 'Account creation failed due to system error. Our team has been notified.',
          code: 'AUTH_SYSTEM_ERROR',
          requiresSupport: true
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

    // Step 2: Create user profile
    const userProfileData = {
      id: user.id,
      email: formData.email.trim().toLowerCase(),
      full_name: formData.fullName.trim(),
      phone: formData.phone?.trim() || null,
      role: 'seller',
      is_active: true
    };

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([userProfileData]);

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't fail the signup, but log the error
    }

    // Step 3: Create seller profile
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
      is_approved: false
    };

    const { error: sellerError } = await supabase
      .from('seller_profiles')
      .insert([sellerProfileData]);

    if (sellerError) {
      console.error('Error creating seller profile:', sellerError);
      // Don't fail the signup, but log the error
    }

    console.log('✅ Seller profiles created successfully for user:', user.id);

    return {
      success: true,
      data,
      needsConfirmation: !data.session,
      message: data.session 
        ? 'Signup successful! Redirecting...' 
        : 'Please check your email to verify your account.'
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
    // Replace your existing signupSeller function with this:
//Enhanced Sign Out with better cleanup
  signOut: async () => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    loading.set(true);
    try {
      // Clear stores first
      session.set(null);
      user.set(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
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
  },

  // Enhanced Reset Password
  resetPassword: async (email) => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    if (!validateEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(), 
        {
          redirectTo: `${window.location.origin}seller/auth/reset-password`
        }
      );
      
      if (error) {
        if (error.message.includes('rate limit')) {
          return { success: false, error: 'Too many reset attempts. Please wait before trying again.' };
        }
        return { success: false, error: error.message };
      }
      
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (err) {
      console.error('Reset password error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'Password updated successfully' };
    } catch (err) {
      console.error('Update password error:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  },
  // Enhanced getCurrentUserProfile with better error handling and dual-table support
  getCurrentUserProfile: async () => {
    if (!supabase) return { success: false, error: 'Authentication service not available' };
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Get user error:', error);
        return { success: false, error: 'Authentication error' };
      }
      
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Get user profile with better error handling
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
        return { success: false, error: 'Failed to fetch user profile' };
      }
      
      if (!userProfile) {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || null,
          role: user.user_metadata?.user_type || 'user',
          is_active: true
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();
          
        if (createError) {
          console.error('Profile creation error:', createError);
          return { success: false, error: 'Failed to create user profile' };
        }
        
        return { success: true, profile: createdProfile, userType: createdProfile.role };
      }

      const userType = userProfile.role;
      
      // If user is seller, get seller profile
      if (userType === 'seller') {
        const { data: sellerProfile, error: sellerError } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (sellerError && sellerError.code !== 'PGRST116') {
          console.error('Seller profile fetch error:', sellerError);
          return { success: false, error: 'Failed to fetch seller profile' };
        }
        
        if (!sellerProfile) {
          // Create seller profile if it doesn't exist
          const newSellerProfile = {
            id: user.id,
            business_name: user.user_metadata?.business_name || '',
            business_type: null,
            address: user.user_metadata?.address || null,
            city: user.user_metadata?.city || null,
            state: user.user_metadata?.state || null,
            pincode: user.user_metadata?.pincode || null,
            gstin: null,
            total_sales: 0.00,
            is_approved: false
          };
          
          const { data: createdSellerProfile, error: createSellerError } = await supabase
            .from('seller_profiles')
            .insert([newSellerProfile])
            .select()
            .single();
            
          if (createSellerError) {
            console.error('Seller profile creation error:', createSellerError);
            return { success: false, error: 'Failed to create seller profile' };
          }
          
          return { 
            success: true, 
            profile: { ...userProfile, ...createdSellerProfile }, 
            userType: 'seller' 
          };
        }
        
        // Combine user_profile and seller_profile data
        const combinedProfile = {
          // User profile fields
          id: userProfile.id,
          email: userProfile.email,
          full_name: userProfile.full_name,
          phone: userProfile.phone,
          username: userProfile.username,
          role: userProfile.role,
          is_active: userProfile.is_active,
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at,
          
          // Seller profile fields
          business_name: sellerProfile.business_name,
          business_type: sellerProfile.business_type,
          address: sellerProfile.address,
          city: sellerProfile.city,
          state: sellerProfile.state,
          pincode: sellerProfile.pincode,
          gstin: sellerProfile.gstin,
          total_sales: sellerProfile.total_sales,
          is_approved: sellerProfile.is_approved,
          approved_at: sellerProfile.approved_at
        };
        
        return { 
          success: true, 
          profile: combinedProfile, 
          userType: 'seller' 
        };
      }
      
      return { success: true, profile: userProfile, userType: userProfile.role };
    } catch (err) {
      console.error('Get current user profile error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  // ... (keeping other methods the same for brevity)
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
      
      // Flatten the nested seller_profiles
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
      
      const { count: approvedSellers, error: approvedError } = await supabase
        .from('seller_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);
        
      if (approvedError) {
        return { success: false, error: approvedError.message };
      }
      
      const { data: salesData, error: salesError } = await supabase
        .from('seller_profiles')
        .select('total_sales');
        
      if (salesError) {
        return { success: false, error: salesError.message };
      }
      
      const totalSales = salesData.reduce((sum, seller) => sum + (seller.total_sales || 0), 0);
      
      return {
        success: true,
        statistics: {
          totalSellers: totalSellers || 0,
          activeSellers: activeSellers || 0,
          approvedSellers: approvedSellers || 0,
          totalSales: totalSales
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateSellerProfile: async (sellerId, updateData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      // Update user_profiles table
      const userUpdateData = {
        full_name: updateData.full_name,
        phone: updateData.phone,
        is_active: updateData.is_active,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(userUpdateData).forEach(key => {
        if (userUpdateData[key] === undefined) {
          delete userUpdateData[key];
        }
      });
      
      const { error: userError } = await supabase
        .from('user_profiles')
        .update(userUpdateData)
        .eq('id', sellerId);
        
      if (userError) {
        return { success: false, error: userError.message };
      }
      
      // Update seller_profiles table
      const sellerUpdateData = {
        business_name: updateData.business_name,
        business_type: updateData.business_type,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        gstin: updateData.gstin,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(sellerUpdateData).forEach(key => {
        if (sellerUpdateData[key] === undefined) {
          delete sellerUpdateData[key];
        }
      });
      
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .update(sellerUpdateData)
        .eq('id', sellerId);
        
      if (sellerError) {
        return { success: false, error: sellerError.message };
      }
      
      return { success: true, message: 'Seller profile updated successfully' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  
  approveSeller: async (sellerId, approved) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const updateData = {
        is_approved: approved,
        updated_at: new Date().toISOString()
      };
      
      if (approved) {
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('seller_profiles')
        .update(updateData)
        .eq('id', sellerId);
        
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        message: approved ? 'Seller approved successfully' : 'Seller rejected successfully' 
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update current user's seller profile
  updateCurrentSellerProfile: async (updateData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const userId = user.id;
      
      // Update user_profiles table
      const userUpdateData = {
        full_name: updateData.full_name,
        phone: updateData.phone,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(userUpdateData).forEach(key => {
        if (userUpdateData[key] === undefined) {
          delete userUpdateData[key];
        }
      });
      
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .update(userUpdateData)
        .eq('id', userId);
        
      if (userProfileError) {
        return { success: false, error: userProfileError.message };
      }
      
      // Update seller_profiles table
      const sellerUpdateData = {
        business_name: updateData.business_name,
        business_type: updateData.business_type,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        gstin: updateData.gstin,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(sellerUpdateData).forEach(key => {
        if (sellerUpdateData[key] === undefined) {
          delete sellerUpdateData[key];
        }
      });
      
      const { error: sellerProfileError } = await supabase
        .from('seller_profiles')
        .update(sellerUpdateData)
        .eq('id', userId);
        
      if (sellerProfileError) {
        return { success: false, error: sellerProfileError.message };
      }
      
      return { success: true, message: 'Profile updated successfully' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    if (!supabase) return null;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }
      
      return user;
    } catch (err) {
      console.error('Error getting current user:', err);
      return null;
    }
  },

  // Update current user's seller profile
  updateCurrentSellerProfile: async (updateData) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const userId = user.id;
      
      // Update user_profiles table
      const userUpdateData = {
        full_name: updateData.full_name,
        phone: updateData.phone,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(userUpdateData).forEach(key => {
        if (userUpdateData[key] === undefined) {
          delete userUpdateData[key];
        }
      });
      
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .update(userUpdateData)
        .eq('id', userId);
        
      if (userProfileError) {
        return { success: false, error: userProfileError.message };
      }
      
      // Update seller_profiles table
      const sellerUpdateData = {
        business_name: updateData.business_name,
        business_type: updateData.business_type,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        gstin: updateData.gstin,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(sellerUpdateData).forEach(key => {
        if (sellerUpdateData[key] === undefined) {
          delete sellerUpdateData[key];
        }
      });
      
      const { error: sellerProfileError } = await supabase
        .from('seller_profiles')
        .update(sellerUpdateData)
        .eq('id', userId);
        
      if (sellerProfileError) {
        return { success: false, error: sellerProfileError.message };
      }
      
      return { success: true, message: 'Profile updated successfully' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}