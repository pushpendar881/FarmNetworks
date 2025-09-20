import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export { PUBLIC_SUPABASE_URL };

// Fallback to hardcoded values if env vars are not loaded
const SUPABASE_URL = PUBLIC_SUPABASE_URL || 'https://agkfjnktjvyxccfeamtf.supabase.co';
const SUPABASE_ANON_KEY = PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2Zqbmt0anZ5eGNjZmVhbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTY3MTAsImV4cCI6MjA2Nzg3MjcxMH0.vEa3uvjJVZ0Vm8DbYMUS2BVvkpi0bNj2LVi-N0R1RtQ';

console.log('Supabase initialization:', {
  browser,
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  envUrl: PUBLIC_SUPABASE_URL,
  envKey: !!PUBLIC_SUPABASE_ANON_KEY
});

export const supabase = browser
  ? createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;

export const authHelpers = {
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

  onAuthStateChange: (callback) => {
    if (!supabase) return () => {};
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  },

  isAuthenticated: async () => {
    const session = await authHelpers.getSession();
    return !!session?.user;
  }
};