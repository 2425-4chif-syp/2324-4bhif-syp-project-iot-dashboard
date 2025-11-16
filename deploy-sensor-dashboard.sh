#!/bin/bash

# Deployment Script for Sensor Dashboard on VM67
# This script deploys the sensor dashboard with proper routing configuration

set -e  # Exit on error

echo "======================================"
echo "Sensor Dashboard Deployment Script"
echo "======================================"
echo ""

# Configuration
VM_USER="poweradm"
VM_HOST="vm67.htl-leonding.ac.at"
VM_PATH="/home/poweradm/2324-4bhif-syp-project-iot-dashboard"
NGINX_CONF_DEST="/etc/nginx/sites-available/vm67"

echo "Step 1: Building and deploying sensor-dashboard..."
ssh ${VM_USER}@${VM_HOST} << 'ENDSSH'
cd ~/2324-4bhif-syp-project-iot-dashboard/sensor-dashboard

echo "Pulling latest changes..."
git pull

echo "Building sensor-frontend with production configuration..."
docker-compose build --no-cache sensor-frontend

echo "Stopping containers..."
docker-compose down

echo "Removing old sensor-frontend container (if exists)..."
docker rm -f sensor-frontend 2>/dev/null || true

echo "Starting all containers..."
docker-compose up -d

echo "Waiting for containers to start..."
sleep 5

echo "Checking container status..."
docker-compose ps
ENDSSH

echo ""
echo "Step 2: Updating nginx configuration..."
scp vm67-nginx.conf ${VM_USER}@${VM_HOST}:~/vm67-nginx.conf

ssh ${VM_USER}@${VM_HOST} << 'ENDSSH'
echo "Installing nginx configuration..."
sudo cp ~/vm67-nginx.conf /etc/nginx/sites-available/vm67

echo "Testing nginx configuration..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Checking nginx status..."
sudo systemctl status nginx --no-pager
ENDSSH

echo ""
echo "======================================"
echo "Deployment completed successfully!"
echo "======================================"
echo ""
echo "Your sensor dashboard should now be available at:"
echo "  https://vm67.htl-leonding.ac.at/sensor-data/"
echo ""
echo "Other services:"
echo "  - Kiosk Frontend: https://vm67.htl-leonding.ac.at/"
echo "  - Sensor API: https://vm67.htl-leonding.ac.at/sensor-api/"
echo "  - Grafana: https://vm67.htl-leonding.ac.at/grafana/"
echo ""
