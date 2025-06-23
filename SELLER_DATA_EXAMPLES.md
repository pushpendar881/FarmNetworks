# Seller Data Management Examples

This document shows you how to fetch and manage data from the `seller_profiles` table in your Supabase database.

## Available Functions

All these functions are available in `src/lib/stores/auth.js`:

### 1. Get Current User Profile
```javascript
import { authStore } from '$lib/stores/auth.js';

// Get current seller profile
const result = await authStore.getCurrentUserProfile();
if (result.success && result.userType === 'seller') {
  const sellerProfile = result.profile;
  console.log('Seller profile:', sellerProfile);
}
```

### 2. Get All Seller Profiles (Admin Use)
```javascript
// Get all sellers with pagination and filters
const result = await authStore.getAllSellerProfiles({
  page: 1,
  limit: 10,
  search: 'search term',
  status: 'active', // 'active', 'inactive', or 'all'
  sortBy: 'created_at',
  sortOrder: 'desc'
});

if (result.success) {
  const sellers = result.sellers;
  const pagination = result.pagination;
  console.log('Sellers:', sellers);
  console.log('Pagination:', pagination);
}
```

### 3. Get Seller by ID
```javascript
// Get specific seller profile by ID
const result = await authStore.getSellerProfile(sellerId);
if (result.success) {
  const sellerProfile = result.profile;
  console.log('Seller profile:', sellerProfile);
}
```

### 4. Get Seller Statistics
```javascript
// Get overall seller statistics
const result = await authStore.getSellerStatistics();
if (result.success) {
  const stats = result.statistics;
  console.log('Total sellers:', stats.totalSellers);
  console.log('Active sellers:', stats.activeSellers);
  console.log('Total sales:', stats.totalSales);
  console.log('Average rating:', stats.averageRating);
}
```

### 5. Update Seller Profile
```javascript
// Update seller profile
const updateData = {
  full_name: 'New Name',
  phone: '1234567890',
  business_name: 'New Business Name',
  business_type: 'Electronics',
  address: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  gstin: 'GSTIN123456789',
  commission_rate: 15.5
};

const result = await authStore.updateSellerProfile(sellerId, updateData);
if (result.success) {
  console.log('Profile updated successfully');
}
```

### 6. Approve/Reject Seller (Admin Use)
```javascript
// Approve or reject a seller
const result = await authStore.approveSeller(sellerId, true, adminId);
if (result.success) {
  console.log('Seller approved successfully');
}
```

## Database Schema

The `seller_profiles` table structure:

```sql
CREATE TABLE public.seller_profiles (
  id uuid NOT NULL,
  business_name text,
  business_type text,
  address text,
  city text,
  state text,
  pincode text,
  gstin text,
  commission_rate decimal(5,2) DEFAULT 10.00,
  total_sales decimal(12,2) DEFAULT 0.00,
  rating decimal(3,2) DEFAULT 0.00,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT seller_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);
```

## Using the Seller Store

For easier state management, use the dedicated seller store:

```javascript
import { sellerStore, sellers, currentSeller, sellerStats, loading, error } from '$lib/stores/sellerStore.js';

// Load current seller
await sellerStore.loadCurrentSeller();

// Load all sellers
await sellerStore.loadAllSellers();

// Load statistics
await sellerStore.loadSellerStats();

// Update seller
await sellerStore.updateSeller(sellerId, updateData);

// Search sellers
await sellerStore.searchSellers('search term', { status: 'active' });
```

## Example Components

### 1. Seller List Component
```svelte
<script>
  import { onMount } from 'svelte';
  import { sellerStore, sellers, loading } from '$lib/stores/sellerStore.js';

  onMount(async () => {
    await sellerStore.loadAllSellers();
  });
</script>

{#if $loading}
  <p>Loading sellers...</p>
{:else}
  {#each $sellers as seller}
    <div class="seller-card">
      <h3>{seller.full_name}</h3>
      <p>{seller.email}</p>
      <p>Business: {seller.business_name}</p>
      <p>Sales: ₹{seller.total_sales}</p>
    </div>
  {/each}
{/if}
```

### 2. Seller Profile Component
```svelte
<script>
  import { onMount } from 'svelte';
  import { sellerStore, currentSeller } from '$lib/stores/sellerStore.js';

  onMount(async () => {
    await sellerStore.loadCurrentSeller();
  });
</script>

{#if $currentSeller}
  <div class="profile">
    <h2>{$currentSeller.full_name}</h2>
    <p>Email: {$currentSeller.email}</p>
    <p>Business: {$currentSeller.business_name}</p>
    <p>Total Sales: ₹{$currentSeller.total_sales}</p>
    <p>Rating: {$currentSeller.rating}/5.0</p>
  </div>
{/if}
```

## Error Handling

All functions return a consistent response format:

```javascript
// Success response
{
  success: true,
  profile: sellerData, // or sellers, statistics, etc.
  message: 'Operation completed successfully'
}

// Error response
{
  success: false,
  error: 'Error message describing what went wrong'
}
```

## Common Use Cases

### 1. Admin Dashboard
- Load all sellers with pagination
- Get seller statistics
- Approve/reject sellers
- Search and filter sellers

### 2. Seller Dashboard
- Load current seller profile
- Update business information
- View performance metrics

### 3. Profile Management
- Edit personal information
- Update business details
- Manage address information

## Tips

1. **Always check for success**: All functions return a `success` boolean
2. **Handle loading states**: Use the `loading` store for better UX
3. **Error handling**: Always catch and display errors appropriately
4. **Pagination**: Use the pagination object for large datasets
5. **Search**: Implement search functionality for better user experience

## Testing

To test these functions:

1. Create a seller account
2. Login as admin to view all sellers
3. Try updating seller profiles
4. Test search and filtering
5. Check error handling with invalid data

The functions are designed to work with your existing Supabase setup and follow the database schema you provided. 