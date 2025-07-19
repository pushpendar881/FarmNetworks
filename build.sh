#!/bin/bash

# Production build script for FarmNetworks

echo "🚀 Starting production build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Create production directory
echo "📁 Creating production directory..."
mkdir -p production

# Copy build files
echo "📋 Copying build files..."
cp -r build production/
cp package.json production/
cp -r static production/

# Copy environment file if exists
if [ -f .env ]; then
    echo "🔐 Copying environment file..."
    cp .env production/
fi

echo "✅ Production build completed!"
echo "📂 Production files are in the 'production' directory"
echo "🚀 To start the server, run: cd production && npm start" 