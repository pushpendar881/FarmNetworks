// src/lib/supabase.js (fixed filename)
import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';

const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";

// Export the URL for use in other files
export const PUBLIC_SUPABASE_URL = supabaseUrl;

// Create client only in browser environment
export const supabase = browser
  ? createBrowserClient(supabaseUrl, supabaseKey, {
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