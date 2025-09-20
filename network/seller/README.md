# Seller Portal - FarmNetworks

This is the seller portal for the FarmNetworks platform, built with SvelteKit.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy the `.env` file and update if needed.

3. Start the development server:
```bash
npm run dev
```

The seller portal will be available at `http://localhost:5174`

### Available Scripts

- `npm run dev` - Start development server on port 5174
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Start production server

### Features

- Seller authentication and registration
- Dashboard with analytics
- Earnings tracking
- Profile management
- Location mapping
- Support system

### Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable components
│   ├── stores/         # Svelte stores for state management
│   └── supabase.js     # Supabase client configuration
├── routes/
│   ├── auth/           # Authentication pages
│   └── portal/         # Main seller portal pages
├── app.css             # Global styles
├── app.html            # HTML template
└── hooks.server.js     # Server-side hooks
```

### Environment Variables

- `PUBLIC_SUPABASE_URL` - Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `PORT` - Server port (default: 5174)
- `HOST` - Server host (default: 0.0.0.0)