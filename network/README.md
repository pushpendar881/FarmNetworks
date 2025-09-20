# FarmNetworks - Dual Portal System

This directory contains two independent Svelte applications that make up the FarmNetworks platform:

## Projects

### 🌾 Seller Portal (`/seller`)
- **Port**: 5174
- **Purpose**: Interface for farmers and agricultural sellers
- **Features**: Dashboard, earnings tracking, profile management, location mapping

### 🛡️ Admin Portal (`/admin`)
- **Port**: 5175  
- **Purpose**: Administrative interface for system management
- **Features**: User management, system analytics, device management, platform oversight

## Quick Start

### Running Both Projects

1. **Install dependencies for both projects:**
```bash
# Install seller portal dependencies
cd seller
npm install
cd ..

# Install admin portal dependencies  
cd admin
npm install
cd ..
```

2. **Start both development servers:**
```bash
# Terminal 1 - Start seller portal
cd seller
npm run dev

# Terminal 2 - Start admin portal  
cd admin
npm run dev
```

3. **Access the applications:**
- Seller Portal: http://localhost:5174
- Admin Portal: http://localhost:5175

### Production Deployment

Each project can be built and deployed independently:

```bash
# Build seller portal
cd seller
npm run build
npm start

# Build admin portal
cd admin  
npm run build
npm start
```

## Architecture

Both applications share:
- Same Supabase backend
- Similar authentication system
- Shared database schema
- Common UI components (copied to each project)

But they are completely independent:
- Separate package.json files
- Independent deployments
- Different ports
- Isolated dependencies

## Environment Configuration

Each project has its own `.env` file with the same Supabase configuration but different ports:

**Seller Portal (.env):**
```
PORT=5174
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

**Admin Portal (.env):**
```
PORT=5175
PUBLIC_SUPABASE_URL=your_supabase_url  
PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Development Workflow

1. **Feature Development**: Work on each portal independently
2. **Shared Components**: Copy components between projects as needed
3. **Database Changes**: Update both projects when schema changes
4. **Testing**: Test each portal separately
5. **Deployment**: Deploy each portal to different domains/subdomains

## Benefits of This Architecture

✅ **Independent Scaling**: Scale each portal based on usage
✅ **Isolated Deployments**: Deploy updates without affecting the other portal  
✅ **Technology Flexibility**: Use different versions or tools per portal
✅ **Team Separation**: Different teams can work on different portals
✅ **Security**: Admin and seller concerns are completely separated