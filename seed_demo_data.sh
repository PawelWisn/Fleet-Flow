#!/bin/bash
set -e

echo "FleetFlow Database Seeding Script"
echo "====================================="
echo ""
echo "This script will populate database with data for demonstration purposes"
echo "Existing data will be cleared."
echo ""

read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding cancelled"
    exit 1
fi

echo ""
echo "Starting seeding..."
echo ""

docker compose exec \
    -e POSTGRES_HOST=db \
    -e POSTGRES_DB=fleetflow \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=password \
    backend python seed_data_raw.py

echo ""
echo "Seeding completed!"
echo ""
echo "You can now log in with these demo accounts:"
echo "  Admin:   admin@example.com / FleetFlow1!"
echo "  Manager: john.manager@logistics.com / FleetFlow1!"
echo "  Worker:  sarah.driver@logistics.com / FleetFlow1!"
echo ""
