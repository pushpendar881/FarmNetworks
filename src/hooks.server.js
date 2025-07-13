import { createServerClient } from '@supabase/ssr'
import { redirect } from '@sveltejs/kit'

// const supabaseUrl =    "https://ptbmahjwwarmkupzqulh.supabase.co"
// const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ym1haGp3d2FybWt1cHpxdWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjQ5MDksImV4cCI6MjA2NTkwMDkwOX0.Osd9yq9kF8E6eYIEOwCYXqIfeBb5nOrNzquF1bJOPXA"



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

  // Get session from cookies
  const {
    data: { session }
  } = await event.locals.supabase.auth.getSession()

  event.locals.session = session
  event.locals.user = session?.user ?? null

  const { pathname } = event.url

  // Define route patterns
  const adminProtectedRoutes = ['/admin/dashboard']
  const sellerProtectedRoutes = ['/seller/portal']
  const adminAuthRoutes = ['/admin/auth/login']
  const sellerAuthRoutes = ['/seller/auth/login', '/seller/auth/signup']
  const publicRoutes = ['/']

  // Check route types
  const isAdminProtected = adminProtectedRoutes.some(route => pathname.startsWith(route))
  const isSellerProtected = sellerProtectedRoutes.some(route => pathname.startsWith(route))
  const isAdminAuth = adminAuthRoutes.some(route => pathname.startsWith(route))
  const isSellerAuth = sellerAuthRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.includes(pathname)

  // Handle authentication logic
  if (session) {
    const userType = session.user.user_metadata?.user_type || 'seller' // default to seller
    
    // Redirect authenticated users away from auth pages
    if (isAdminAuth || isSellerAuth) {
      if (userType === 'admin') {
        throw redirect(303, '/admin/dashboard')
      } else {
        throw redirect(303, '/seller/portal/dashboard')
      }
    }

    // Check if user is accessing correct portal
    if (isAdminProtected && userType !== 'admin') {
      throw redirect(303, '/seller/portal/dashboard')
    }
    
    if (isSellerProtected && userType === 'admin') {
      throw redirect(303, '/admin/dashboard')
    }
  } else {
    // No session - redirect to appropriate login
    if (isAdminProtected) {
      throw redirect(303, '/admin/auth/login')
    }
    
    if (isSellerProtected) {
      throw redirect(303, '/seller/auth/login')
    }

    // Redirect from root to seller login (or you could show a landing page)
    // if (pathname === '/') {
    //   throw redirect(303, '/seller/auth/login')
    // }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range'
    }
  })
}