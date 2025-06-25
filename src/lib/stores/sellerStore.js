import { writable, derived } from 'svelte/store'
import { authStore } from './auth.js'

// Seller state stores
export const sellers = writable([])
export const currentSeller = writable(null)
export const sellerStats = writable(null)
export const loading = writable(false)
export const error = writable(null)

// Derived stores
export const activeSellers = derived(sellers, ($sellers) => 
  $sellers.filter(seller => seller.is_active)
)

export const inactiveSellers = derived(sellers, ($sellers) => 
  $sellers.filter(seller => !seller.is_active)
)

// Seller management functions
export const sellerStore = {
  // Load current seller profile
  loadCurrentSeller: async () => {
    loading.set(true)
    error.set(null)
    
    try {
      const result = await authStore.getCurrentUserProfile()
      console.log(result);
      if (result.success && result.userType === 'seller') {
        currentSeller.set(result.profile)
        return { success: true, profile: result.profile }
      } else {
        error.set('No seller profile found')
        return { success: false, error: 'No seller profile found' }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Load all sellers (for admin use)
  loadAllSellers: async (options = {}) => {
    loading.set(true)
    error.set(null)
    
    try {
      const result = await authStore.getAllSellerProfiles(options)
      
      if (result.success) {
        sellers.set(result.sellers)
        return { 
          success: true, 
          sellers: result.sellers,
          pagination: result.pagination
        }
      } else {
        error.set(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Load seller by ID
  loadSellerById: async (sellerId) => {
    loading.set(true)
    error.set(null)
    
    try {
      const result = await authStore.getSellerProfile(sellerId)
      
      if (result.success) {
        return { success: true, profile: result.profile }
      } else {
        error.set(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Load seller statistics
  loadSellerStats: async () => {
    loading.set(true)
    error.set(null)
    
    try {
      const result = await authStore.getSellerStatistics()
      
      if (result.success) {
        sellerStats.set(result.statistics)
        return { success: true, statistics: result.statistics }
      } else {
        error.set(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Update seller profile
  updateSeller: async (sellerId, updateData) => {
    loading.set(true)
    error.set(null)
    
    try {

      const result = await authStore.updateSellerProfile (sellerId, updateData)
      
      if (result.success) {
        // Refresh the sellers list if we're on admin dashboard
        await sellerStore.loadAllSellers()
        return { success: true, message: result.message }
      } else {
        error.set(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Approve/Reject seller
  approveSeller: async (sellerId, approved, adminId) => {
    loading.set(true)
    error.set(null)
    
    try {
      const result = await authStore.approveSeller(sellerId, approved, adminId)
      
      if (result.success) {
        // Refresh the sellers list
        await sellerStore.loadAllSellers()
        return { success: true, message: result.message }
      } else {
        error.set(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Search sellers
  searchSellers: async (searchTerm, filters = {}) => {
    loading.set(true)
    error.set(null)
    
    try {
      const options = {
        search: searchTerm,
        ...filters
      }
      
      const result = await authStore.getAllSellerProfiles(options)
      
      if (result.success) {
        sellers.set(result.sellers)
        return { 
          success: true, 
          sellers: result.sellers,
          pagination: result.pagination
        }
      } else {
        error.set(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.set(err.message)
      return { success: false, error: err.message }
    } finally {
      loading.set(false)
    }
  },

  // Clear stores
  clearStores: () => {
    sellers.set([])
    currentSeller.set(null)
    sellerStats.set(null)
    error.set(null)
  }
}

// Initialize seller data when store is imported
export const initializeSellerStore = async () => {
  // This can be called when the app starts to preload seller data
  // For now, we'll leave it empty and let components call specific functions
} 