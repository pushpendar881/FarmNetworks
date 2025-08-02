// src/lib/supabase.js (fixed filename)
import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
 

// const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
// const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";



// const supabaseUrl = "https://agkfjnktjvyxccfeamtf.supabase.co";
// const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2Zqbmt0anZ5eGNjZmVhbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTY3MTAsImV4cCI6MjA2Nzg3MjcxMH0.vEa3uvjJVZ0Vm8DbYMUS2BVvkpi0bNj2LVi-N0R1RtQ";
export { PUBLIC_SUPABASE_URL };
// Create client only in browser environment
export const supabase = browser
  ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;

// Auth helpers for common operations
export const authHelpers = {
  // Get current session safely
  getSession: async () => {
    if (!supabase) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    if (!supabase) return () => {};
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const session = await authHelpers.getSession();
    return !!session?.user;
  }
};
export const realtimeConfig = {
  heartbeatIntervalMs: 30000,
  reconnectAfterMs: (tries) => Math.min(tries * 1000, 30000),
  logger: console.log,
  encode: (payload, callback) => {
    return callback(JSON.stringify(payload))
  },
  decode: (payload, callback) => {
    return callback(JSON.parse(payload))
  }
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error, operation = 'database operation') {
  console.error(`Error during ${operation}:`, error)
  
  if (error?.message) {
    return {
      success: false,
      error: error.message,
      details: error
    }
  }
  
  return {
    success: false,
    error: `Unknown error during ${operation}`,
    details: error
  }
}

// Helper function for pagination
export function getPaginationParams(page = 1, limit = 10) {
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  return { from, to }
}

// Helper function to format database timestamps
export function formatTimestamp(timestamp) {
  if (!timestamp) return null
  
  try {
    return new Date(timestamp).toISOString()
  } catch (error) {
    console.error('Invalid timestamp format:', timestamp)
    return null
  }
}