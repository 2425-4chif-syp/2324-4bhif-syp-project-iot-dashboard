# VM67 Nginx Configuration Deployment Guide

This guide explains how to deploy the nginx reverse proxy configuration on vm67 to enable routing for both frontends.

## Architecture Overview

```
Internet
    ↓
VM67 Nginx (Port 80/443)
    ├─→ /                    → Kiosk Frontend (localhost:8000)
    ├─→ /sensor-data/        → Sensor Dashboard (localhost:4200)
    ├─→ /sensor-api/         → Sensor Backend API (localhost:8081)
    └─→ /grafana/            → Grafana (localhost:3000)
```

## Prerequisites

- SSH access to vm67 with sudo privileges
- Docker containers running:
  - Kiosk Frontend on port 8000
  - Sensor Dashboard on port 4200
  - Sensor Backend on port 8081

## Deployment Steps

### 1. Transfer Files to VM67

From your local machine:

```bash
# Navigate to project root
cd /home/denis/Dokumente/SYP/Fork-github/2324-4bhif-syp-project-iot-dashboard

# Copy files to VM67
scp vm67-nginx.conf poweradm@vm67.htl-leonding.ac.at:~/
scp deploy-nginx-vm67.sh poweradm@vm67.htl-leonding.ac.at:~/
```

### 2. Connect to VM67

```bash
ssh poweradm@vm67.htl-leonding.ac.at
```

### 3. Run Deployment Script

```bash
# Make script executable
chmod +x deploy-nginx-vm67.sh

# Run with sudo
sudo ./deploy-nginx-vm67.sh
```

The script will:
- ✓ Backup existing configuration
- ✓ Install new nginx config
- ✓ Test configuration
- ✓ Reload nginx

### 4. Verify Docker Containers

Make sure all containers are running:

```bash
# Check Kiosk Frontend
docker ps | grep kiosk
curl -I http://localhost:8000

# Check Sensor Dashboard
docker ps | grep sensor-frontend
curl -I http://localhost:4200

# Check Sensor Backend
docker ps | grep quarkus
curl -I http://localhost:8081
```

### 5. Test the Setup

Open in browser:
- Kiosk: `https://vm67.htl-leonding.ac.at/`
- Sensor Dashboard: `https://vm67.htl-leonding.ac.at/sensor-data/`

Test navigation:
1. Go to Kiosk → Click "Sensor-Dashboard" button
2. Should open Sensor Dashboard
3. Click "Zurück zum Kiosk" button
4. Should return to Kiosk

## Troubleshooting

### 502 Bad Gateway Error

If you get 502 errors:

```bash
# Check which containers are running
docker ps

# Check container logs
docker logs sensor-frontend
docker logs quarkus-app

# Verify ports are accessible
curl -I http://localhost:4200
curl -I http://localhost:8081

# Check nginx error log
sudo tail -f /var/log/nginx/vm67-error.log
```

### SSL Certificate Issues

If you see SSL warnings, update the certificate paths in `vm67-nginx.conf`:

```nginx
ssl_certificate /path/to/your/certificate.crt;
ssl_certificate_key /path/to/your/private.key;
```

### Container Not Starting

```bash
# Rebuild and restart sensor-dashboard
cd 2324-4bhif-syp-project-iot-dashboard/sensor-dashboard
docker-compose down
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f sensor-frontend
```

## Manual Configuration (Alternative)

If the script doesn't work, you can configure manually:

```bash
# Copy configuration
sudo cp vm67-nginx.conf /etc/nginx/sites-available/vm67

# Create symlink
sudo ln -s /etc/nginx/sites-available/vm67 /etc/nginx/sites-enabled/vm67

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Useful Commands

```bash
# View nginx status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/vm67-access.log

# View error logs
sudo tail -f /var/log/nginx/vm67-error.log

# Reload nginx configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Test nginx configuration
sudo nginx -t

# List all nginx sites
ls -la /etc/nginx/sites-enabled/
```

## Port Mapping Reference

| Service | Container Port | Host Port | Nginx Route |
|---------|---------------|-----------|-------------|
| Kiosk Frontend | 80 | 8000 | `/` |
| Sensor Dashboard | 80 | 4200 | `/sensor-data/` |
| Sensor Backend | 8080 | 8081 | `/sensor-api/` |
| Grafana | 3000 | 3000 | `/grafana/` |

## Notes

- The configuration automatically redirects HTTP to HTTPS
- WebSocket support is included for real-time updates
- All proxy headers are correctly set for proper request forwarding
- Health check endpoint available at `/health`

## Rollback

If something goes wrong, restore from backup:

```bash
# List backups
ls -la /etc/nginx/backups/

# Restore backup (replace timestamp with actual)
sudo cp /etc/nginx/backups/vm67_YYYYMMDD_HHMMSS.conf /etc/nginx/sites-available/vm67

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```
