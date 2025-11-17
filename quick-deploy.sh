#!/bin/bash

# Quick Deployment Script for Sensor Dashboard
# This script deploys only the sensor-dashboard after code changes

set -e

echo "🚀 Deploying Sensor Dashboard to VM67..."
echo ""

VM_USER="poweradm"
VM_HOST="vm67.htl-leonding.ac.at"

echo "📡 Connecting to VM and deploying..."
ssh ${VM_USER}@${VM_HOST} << 'ENDSSH'
cd ~/2324-4bhif-syp-project-iot-dashboard

echo "📥 Pulling latest changes from git..."
git pull

echo "🔨 Rebuilding sensor-frontend container..."
cd sensor-dashboard
docker-compose build --no-cache sensor-frontend

echo "🔄 Restarting sensor-frontend..."
docker-compose up -d sensor-frontend

echo "⏳ Waiting for container to start..."
sleep 3

echo "✅ Checking container status..."
docker-compose ps sensor-frontend

echo ""
echo "📊 Checking logs (last 20 lines)..."
docker-compose logs --tail=20 sensor-frontend
ENDSSH

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌐 Your sensor dashboard should now show values at:"
echo "   https://vm67.htl-leonding.ac.at/sensor-data/"
echo ""
echo "💡 Tip: Check browser console (F12) for any API errors"
echo ""
