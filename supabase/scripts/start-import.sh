#!/bin/bash

# Quick Start Script for Product Import
# Run this after setting up your .env file

echo "🚀 Product Import - Quick Start"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and fill in your credentials:"
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Check if CSV exists
if [ ! -f "../../products (1).csv" ]; then
    echo "❌ CSV file not found!"
    echo "Please make sure 'products (1).csv' is in the project root directory"
    echo ""
    exit 1
fi

# Check for required env vars
source .env

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Supabase credentials missing in .env!"
    echo "Please fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    exit 1
fi

echo "✅ Configuration validated!"
echo ""
echo "📊 Import Preview:"
echo "  - Source: products (1).csv"
echo "  - Images: Google Images search → Placeholder fallback"
echo "  - Batch size: 50 products"
echo "  - Estimated time: 1-2 hours (with images)"
echo ""
read -p "Ready to start import? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🎯 Starting import..."
    echo ""
    npm run import
else
    echo "Import cancelled."
    exit 0
fi
