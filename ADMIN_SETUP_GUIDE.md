# Admin Authentication Setup Guide

## Overview
This guide explains how to set up the dedicated admin authentication system using the `admin_profiles` table.

## Database Schema
The admin authentication uses the following table structure:

```sql
CREATE TABLE public.admin_profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

## Setup Steps

### 1. Create First Admin Account
Navigate to `/admin/auth/setup` to create the first admin account. This page will:
- Create a new user in Supabase Auth
- Create an entry in the `admin_profiles` table
- Create an entry in the `user_profiles` table with role 'admin'

### 2. Admin Login
Once the admin account is created, you can login at `/admin/auth/login` using:
- The email and password you set up
- The system will verify the user has an admin profile
- If successful, you'll be redirected to `/admin/adminportal/dashboard`

### 3. Admin Portal Access
The admin portal is protected by authentication and will:
- Check if the user has an admin profile
- Redirect to login if not authenticated
- Show the admin dashboard if authenticated

## Key Features

### Admin Authentication Store (`adminAuth.js`)
- **Dedicated admin authentication**: Uses `admin_profiles` table
- **Profile validation**: Ensures user has admin profile
- **Session management**: Handles admin sessions separately
- **Logout functionality**: Properly clears admin sessions

### Admin Login Page (`/admin/auth/login`)
- **Admin-specific validation**: Only allows users with admin profiles
- **Error handling**: Clear error messages for different scenarios
- **Remember me**: Optional session persistence
- **Security**: Redirects to login if not admin

### Admin Layout Protection (`/admin/adminportal/+layout.svelte`)
- **Authentication check**: Verifies admin status on each page load
- **Loading states**: Shows loading spinner during auth check
- **Redirect logic**: Automatically redirects to login if not authenticated

## Security Features

1. **Separate Authentication**: Admin auth is completely separate from regular user auth
2. **Profile Validation**: Only users with entries in `admin_profiles` can access admin features
3. **Session Management**: Proper session cleanup on logout
4. **Error Handling**: Clear error messages for unauthorized access

## Usage

### For Admin Users:
1. Go to `/admin/auth/setup` to create the first admin account
2. Use `/admin/auth/login` for subsequent logins
3. Access admin features at `/admin/adminportal/dashboard`

### For Developers:
1. The admin auth system is completely separate from regular auth
2. Admin users need entries in both `auth.users` and `admin_profiles`
3. The system checks for admin profile existence before allowing access

## Troubleshooting

### Common Issues:

1. **"Access denied. Admin privileges required."**
   - User exists but no admin profile
   - Solution: Create admin profile for the user

2. **"Invalid email or password."**
   - Check credentials
   - Ensure user exists in auth system

3. **"Your admin account has been blocked."**
   - Check if user is blocked in `user_profiles.is_blocked`
   - Unblock the user if needed

### Adding More Admins:
1. Create user account normally
2. Add entry to `admin_profiles` table with user's UUID
3. Add entry to `user_profiles` table with role 'admin'

## Database Queries

### Check if user is admin:
```sql
SELECT * FROM admin_profiles WHERE id = 'user-uuid';
```

### Add admin profile:
```sql
INSERT INTO admin_profiles (id) VALUES ('user-uuid');
```

### Remove admin access:
```sql
DELETE FROM admin_profiles WHERE id = 'user-uuid';
```

## File Structure

```
src/
├── lib/
│   └── stores/
│       ├── auth.js          # Regular user authentication
│       └── adminAuth.js     # Admin authentication
├── routes/
│   └── admin/
│       ├── auth/
│       │   ├── login/
│       │   │   └── +page.svelte
│       │   └── setup/
│       │       └── +page.svelte
│       └── adminportal/
│           └── +layout.svelte
```

This setup provides a secure, dedicated admin authentication system that's completely separate from the regular user authentication system. 