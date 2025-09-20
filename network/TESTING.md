# FarmNetworks Testing Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   cd network
   npm install
   cd seller && npm install
   cd ../admin && npm install
   ```

2. **Start development servers:**
   ```bash
   # Option 1: Use the batch file (Windows)
   start-dev.bat
   
   # Option 2: Manual start
   # Terminal 1:
   cd seller && npm run dev
   
   # Terminal 2: 
   cd admin && npm run dev
   ```

3. **Access the applications:**
   - Seller Portal: http://localhost:5174
   - Admin Portal: http://localhost:5175

## Testing Login

### Seller Portal Test Pages:
- **Normal Login**: http://localhost:5174/auth/login
- **Test Login**: http://localhost:5174/test-login (with debug info)
- **Test Dashboard**: http://localhost:5174/portal/test-dashboard (simple success page)
- **Supabase Debug**: http://localhost:5174/debug-supabase (connection test)

### Admin Portal Test Pages:
- **Normal Login**: http://localhost:5175/auth/login
- **Test Login**: http://localhost:5175/test-login (with debug info)
- **Test Dashboard**: http://localhost:5175/adminportal/test-dashboard (simple success page)
- **Supabase Debug**: http://localhost:5175/debug-supabase (connection test)

### Debug Steps:

1. **Check Supabase Connection First**:
   - Seller: http://localhost:5174/debug-supabase
   - Admin: http://localhost:5175/debug-supabase
   - Verify "Supabase Client: Initialized" and "Connection Status: Success"

2. **Open browser console** (F12) to see debug logs

3. **Try the test login pages**:
   - Seller: http://localhost:5174/test-login
   - Admin: http://localhost:5175/test-login

4. **Check console output** for:
   - "Supabase initialization:" (should show proper URL and key)
   - "authStore.signIn called with:" / "adminAuthStore.adminSignIn called with:"
   - "Attempting Supabase signIn with:"
   - "Supabase signIn response:"
   - "Login successful, setting user and session"

### Common Issues:

1. **Button shows "Signing in..." but doesn't proceed:**
   - First check `/debug-supabase` page to verify connection
   - Check browser console for errors
   - Verify Supabase credentials in .env files
   - Check network tab for failed requests

2. **Supabase Client not initialized:**
   - Check if running in browser environment
   - Verify environment variables are loaded
   - Restart dev server after changing .env files
   - Check console for "Supabase initialization:" logs

3. **Environment variables not loading:**
   - Ensure .env files exist in both seller/ and admin/ folders
   - Try both `PUBLIC_*` and `VITE_PUBLIC_*` formats
   - Restart dev server after changing .env files

4. **Supabase connection issues:**
   - Verify PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY
   - Check if Supabase project is active
   - Test connection on `/debug-supabase` page first

### Current Configuration:

**Seller Portal:**
- **Seller Profile Checks**: Temporarily disabled for testing
- **Database Queries**: Simplified to focus on basic auth
- **Debug Logging**: Enabled in auth store
- **Toast Notifications**: Added to layout

**Admin Portal:**
- **Admin Profile Checks**: Temporarily disabled for testing
- **Database Queries**: Simplified to focus on basic auth
- **Debug Logging**: Enabled in admin auth store
- **Toast Notifications**: Added to layout
- **Components**: LoadingSpinner and Toast copied from seller portal

## Project Structure

```
network/
├── seller/          # Seller Portal (Port 5174)
├── admin/           # Admin Portal (Port 5175)  
├── package.json     # Root package with scripts
├── start-dev.bat    # Windows startup script
└── README.md        # Project documentation
```

## Next Steps

Once basic login works:
1. Re-enable seller profile validation
2. Test full dashboard functionality
3. Verify admin portal login
4. Test production builds