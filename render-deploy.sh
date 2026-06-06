#!/bin/bash

echo "🚀 Starting PulsePortal Deployment Script..."

echo "🧹 Clearing stale cache..."
php artisan config:clear  || echo "⚠️  config:clear failed"
php artisan cache:clear   || echo "⚠️  cache:clear failed"
php artisan route:clear   || echo "⚠️  route:clear failed"
php artisan view:clear    || echo "⚠️  view:clear failed"

echo "⚙️  Caching config for production..."
php artisan config:cache  || echo "⚠️  config:cache failed"
php artisan route:cache   || echo "⚠️  route:cache failed"
php artisan view:cache    || echo "⚠️  view:cache failed"

echo "🗄️  Running migrations..."
php artisan migrate --force || echo "⚠️  migrate failed"

echo "🚀 Starting Web Server (Apache)..."
exec apache2-foreground