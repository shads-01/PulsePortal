#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Deployment Script..."

# The Dockerfile already runs composer install, but we can do a quick check
# echo "Running composer..."
# composer install --no-dev --optimize-autoloader --no-interaction

echo "Clearing cache and configuration..."
php artisan config:clear
php artisan cache:clear

echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running migrations..."
# --force is required for production
php artisan migrate --force

echo "🚀 Starting Web Server..."
/start.sh
