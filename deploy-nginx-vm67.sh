#!/bin/bash

# Deployment Script for VM67 Nginx Configuration
# Run this script on vm67 to deploy the nginx configuration

set -e  # Exit on error

echo "=========================================="
echo "VM67 Nginx Configuration Deployment"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Error: This script must be run as root or with sudo"
    echo "Usage: sudo ./deploy-nginx-vm67.sh"
    exit 1
fi

# Backup existing configuration
BACKUP_DIR="/etc/nginx/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo ""
echo "Step 1: Creating backup directory..."
mkdir -p "$BACKUP_DIR"

if [ -f /etc/nginx/sites-available/vm67 ]; then
    echo "Step 2: Backing up existing configuration..."
    cp /etc/nginx/sites-available/vm67 "$BACKUP_DIR/vm67_$TIMESTAMP.conf"
    echo "Backup created: $BACKUP_DIR/vm67_$TIMESTAMP.conf"
else
    echo "Step 2: No existing configuration found, skipping backup..."
fi

# Copy new configuration
echo ""
echo "Step 3: Installing new nginx configuration..."
cp vm67-nginx.conf /etc/nginx/sites-available/vm67

# Create symlink if it doesn't exist
if [ ! -L /etc/nginx/sites-enabled/vm67 ]; then
    echo "Step 4: Creating symlink in sites-enabled..."
    ln -s /etc/nginx/sites-available/vm67 /etc/nginx/sites-enabled/vm67
else
    echo "Step 4: Symlink already exists, skipping..."
fi

# Test nginx configuration
echo ""
echo "Step 5: Testing nginx configuration..."
if nginx -t; then
    echo "✓ Nginx configuration test passed"
else
    echo "✗ Nginx configuration test failed!"
    echo "Restoring backup..."
    if [ -f "$BACKUP_DIR/vm67_$TIMESTAMP.conf" ]; then
        cp "$BACKUP_DIR/vm67_$TIMESTAMP.conf" /etc/nginx/sites-available/vm67
        echo "Backup restored. Please check your configuration."
    fi
    exit 1
fi

# Reload nginx
echo ""
echo "Step 6: Reloading nginx..."
if systemctl reload nginx; then
    echo "✓ Nginx reloaded successfully"
else
    echo "✗ Failed to reload nginx"
    echo "Attempting to restart nginx..."
    systemctl restart nginx
fi

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Services are now accessible at:"
echo "  • Kiosk Frontend:       https://vm67.htl-leonding.ac.at/"
echo "  • Sensor Dashboard:     https://vm67.htl-leonding.ac.at/sensor-data/"
echo "  • Sensor Backend API:   https://vm67.htl-leonding.ac.at/sensor-api/"
echo "  • Grafana:              https://vm67.htl-leonding.ac.at/grafana/"
echo ""
echo "To check nginx status: systemctl status nginx"
echo "To view logs:          tail -f /var/log/nginx/vm67-*.log"
echo ""
