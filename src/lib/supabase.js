import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = "https://ptbmahjwwarmkupzqulh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA";

export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseKey, {
      global: { fetch },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;