#!/bin/bash

# Quick Nginx Setup Script for VM67
# Run this directly on the VM: curl -sSL https://raw.githubusercontent.com/... | sudo bash
# Or: ssh poweradm@vm67 'bash -s' < setup-nginx-vm67.sh

set -e

echo "=========================================="
echo "VM67 Nginx Configuration Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Error: This script must be run as root or with sudo"
    exit 1
fi

# Create backup directory
BACKUP_DIR="/etc/nginx/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup existing config if it exists
if [ -f /etc/nginx/sites-available/vm67 ]; then
    echo "Backing up existing configuration..."
    cp /etc/nginx/sites-available/vm67 "$BACKUP_DIR/vm67_$TIMESTAMP.conf"
fi

# Create nginx configuration directly
echo "Creating nginx configuration..."
cat > /etc/nginx/sites-available/vm67 << 'EOF'
# Nginx Configuration for VM67
server {
    listen 80;
    listen [::]:80;
    server_name vm67.htl-leonding.ac.at;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vm67.htl-leonding.ac.at;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/vm67.crt;
    ssl_certificate_key /etc/ssl/private/vm67.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/vm67-access.log;
    error_log /var/log/nginx/vm67-error.log;

    # Kiosk Frontend (Port 8000)
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Sensor Dashboard (Port 4200)
    location /sensor-data/ {
        proxy_pass http://localhost:4200/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Sensor Backend API (Port 8081)
    location /sensor-api/ {
        proxy_pass http://localhost:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Grafana (Port 3000)
    location /grafana/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Create symlink
if [ ! -L /etc/nginx/sites-enabled/vm67 ]; then
    echo "Creating symlink..."
    ln -s /etc/nginx/sites-available/vm67 /etc/nginx/sites-enabled/vm67
fi

# Test configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo "✓ Configuration test passed"
    echo "Reloading nginx..."
    systemctl reload nginx
    echo "✓ Done!"
else
    echo "✗ Configuration test failed!"
    if [ -f "$BACKUP_DIR/vm67_$TIMESTAMP.conf" ]; then
        cp "$BACKUP_DIR/vm67_$TIMESTAMP.conf" /etc/nginx/sites-available/vm67
        echo "Backup restored"
    fi
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup completed!"
echo "=========================================="
echo "Services available at:"
echo "  • https://vm67.htl-leonding.ac.at/"
echo "  • https://vm67.htl-leonding.ac.at/sensor-data/"
echo ""
