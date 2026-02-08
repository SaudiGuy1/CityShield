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
docker compose pull

echo ""
echo "==================================="
echo "Bootstrap complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Review and update .env file with your configuration"
echo "2. Run: docker compose up --build"
echo "3. Wait for all services to be healthy"
echo "4. Access the frontend at http://localhost:3000"
echo "5. Login with default credentials:"
echo "   Username: admin"
echo "   Password: CityShield@Admin2026"
echo "   (Change this password immediately after first login!)"
echo ""
echo "For more information, see README.md"
echo ""
