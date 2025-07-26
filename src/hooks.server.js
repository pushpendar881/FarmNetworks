import { createServerClient } from '@supabase/ssr'

const supabaseUrl = "https://agkfjnktjvyxccfeamtf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2Zqbmt0anZ5eGNjZmVhbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTY3MTAsImV4cCI6MjA2Nzg3MjcxMH0.vEa3uvjJVZ0Vm8DbYMUS2BVvkpi0bNj2LVi-N0R1RtQ";

const PUBLIC_SUPABASE_URL = supabaseUrl
const PUBLIC_SUPABASE_ANON_KEY = supabaseKey

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  // Create Supabase client for server-side
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, { ...options, path: '/' })
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: '/' })
      }
    }
  })

  // Get session from cookies (for prerendering, this will be null)
  const {
    data: { session }
  } = await event.locals.supabase.auth.getSession()

  event.locals.session = session
  event.locals.user = session?.user ?? null

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range'
    }
  })
}