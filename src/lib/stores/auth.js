import { writable } from 'svelte/store';
import { supabase } from '../supabase.js';

export const user = writable(null);
export const loading = writable(true);

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  user.set(session?.user ?? null);
  loading.set(false);
});

supabase.auth.onAuthStateChange((event, session) => {
    user.set(session?.user ?? null);
    loading.set(false);
  });

  export const authStore = {
   

    signIn: async (email, password) => {
      loading.set(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        return { data, error };
      } finally {
        loading.set(false);
      }
    },
  
    signOut: async () => {
      loading.set(true);
      try {
        const { error } = await supabase.auth.signOut();
        return { error };
      } finally {
        loading.set(false);
      }
    },
  
    resetPassword: async (email) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      return { data, error };
    }
  };