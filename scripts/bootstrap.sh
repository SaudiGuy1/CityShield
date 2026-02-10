#!/bin/bash
# CityShield Bootstrap Script
# This script initializes the CityShield platform

set -e

echo "==================================="
echo "CityShield Platform Bootstrap"
echo "==================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  IMPORTANT: Please review and update .env with your own values"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Pull required images
echo "Pulling Docker images..."
# Skip pull if images already exist (avoids Docker Hub connectivity issues)
if [ "$SKIP_PULL" != "true" ]; then
    docker compose pull || echo "⚠️  Warning: Image pull failed, continuing with existing images..."
else
    echo "✓ Skipping image pull (using existing images)"
fi

# Start OpenSearch first (needed for asset index creation)
echo "Starting OpenSearch..."
docker compose up -d opensearch

echo "Waiting for OpenSearch to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        echo "✓ OpenSearch is ready"
        break
    fi
    sleep 2
done

# Create asset index
echo ""
echo "Creating city assets index..."
if [ -f scripts/create_assets_simple.sh ]; then
    chmod +x scripts/create_assets_simple.sh
    ./scripts/create_assets_simple.sh || echo "⚠️  Asset creation failed, continuing..."
else
    echo "⚠️  Asset creation script not found, skipping..."
fi

echo ""
echo "==================================="
echo "Bootstrap complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Run: docker compose up -d"
echo "2. Wait for all services to be healthy (2-3 minutes)"
echo "3. Access the frontend at http://localhost:3000"
echo "4. Login with default credentials:"
echo "   Username: admin"
echo "   Password: CityShield@Admin2026"
echo "   (Change this password immediately after first login!)"
echo "5. Click 'Initialize Dashboards' on Overview page"
echo ""
echo "For more information, see README.md"
echo ""
