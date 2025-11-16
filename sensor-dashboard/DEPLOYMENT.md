# Sensor Dashboard Deployment Guide

## Overview

Das Sensor Dashboard ist eine Angular-Anwendung, die Sensordaten visualisiert. Es läuft auf der VM67 unter dem Pfad `/sensor-data/`.

## Architecture

```
Internet → nginx (VM67:443) → Routing:
  ├─ /                  → Kiosk Frontend (Port 8000)
  ├─ /sensor-data/      → Sensor Dashboard Frontend (Port 4200)
  ├─ /sensor-api/       → Sensor Backend (Quarkus, Port 8081)
  └─ /grafana/          → Grafana (Port 3000)
```

## Important Configuration

### 1. Angular baseHref
Die Angular-Anwendung wird mit `baseHref: "/sensor-data/"` gebaut. Dies ist in `angular.json` konfiguriert:

```json
"configurations": {
  "production": {
    "baseHref": "/sensor-data/",
    ...
  }
}
```

### 2. Dockerfile
Das Dockerfile baut die Anwendung mit der Production-Konfiguration:

```dockerfile
RUN npm run build -- --configuration production
```

### 3. Nginx Konfiguration (Container)
Die nginx-Konfiguration im Container (`Frontend/sensor-frontend/nginx.conf`) leitet alle Routen an `index.html` weiter:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 4. Nginx Konfiguration (VM67)
Die nginx-Konfiguration auf der VM (`vm67-nginx.conf`) leitet Anfragen an den Container weiter:

```nginx
location /sensor-data {
    return 301 /sensor-data/;
}

location /sensor-data/ {
    proxy_pass http://localhost:4200/;
    ...
}
```

## Deployment Steps

### Automatisches Deployment (empfohlen)

```bash
# Von deinem lokalen Rechner aus:
cd ~/Dokumente/SYP/Fork-github/2324-4bhif-syp-project-iot-dashboard
chmod +x deploy-sensor-dashboard.sh
./deploy-sensor-dashboard.sh
```

### Manuelles Deployment

#### 1. Auf der VM einloggen
```bash
ssh poweradm@vm67.htl-leonding.ac.at
```

#### 2. Repository aktualisieren
```bash
cd ~/2324-4bhif-syp-project-iot-dashboard
git pull
```

#### 3. Sensor Dashboard neu bauen und starten
```bash
cd sensor-dashboard
docker-compose build --no-cache sensor-frontend
docker-compose down
docker rm -f sensor-frontend
docker-compose up -d
```

#### 4. Nginx Konfiguration aktualisieren
```bash
# Von deinem lokalen Rechner:
scp vm67-nginx.conf poweradm@vm67.htl-leonding.ac.at:~/

# Auf der VM:
sudo cp ~/vm67-nginx.conf /etc/nginx/sites-available/vm67
sudo nginx -t
sudo systemctl reload nginx
```

## Container Status prüfen

```bash
cd ~/2324-4bhif-syp-project-iot-dashboard/sensor-dashboard
docker-compose ps
docker-compose logs -f sensor-frontend
```

## Troubleshooting

### Problem: Routing funktioniert nicht

**Symptome:**
- Beim direkten Aufruf von `/sensor-data/` funktioniert die App
- Beim Navigieren zu Unterseiten gibt es 404 Fehler
- Nach einem Reload auf einer Unterseite erscheint "Welcome to nginx!"

**Lösung:**
1. Prüfen, ob die Angular-App mit `baseHref` gebaut wurde:
   ```bash
   docker exec -it sensor-frontend sh
   cat /usr/share/nginx/html/index.html | grep base
   # Sollte zeigen: <base href="/sensor-data/">
   ```

2. Prüfen, ob nginx korrekt konfiguriert ist:
   ```bash
   sudo nginx -t
   sudo cat /etc/nginx/sites-available/vm67 | grep -A 10 "sensor-data"
   ```

3. Container neu bauen (mit --no-cache):
   ```bash
   docker-compose build --no-cache sensor-frontend
   docker-compose up -d
   ```

### Problem: API-Aufrufe schlagen fehl

**Symptome:**
- Frontend lädt, aber Daten werden nicht angezeigt
- Browser-Konsole zeigt CORS-Fehler oder 404 für API-Aufrufe

**Lösung:**
1. Prüfen, ob der Quarkus-Backend-Container läuft:
   ```bash
   docker-compose ps quarkus-app
   docker-compose logs quarkus-app
   ```

2. API-Endpunkt im Frontend prüfen:
   - Das Frontend sollte `/api/` für API-Aufrufe verwenden
   - Dies wird im Container zu `http://quarkus-app:8080/` weitergeleitet

3. Nginx-Proxy für `/sensor-api/` prüfen:
   ```bash
   curl -v https://vm67.htl-leonding.ac.at/sensor-api/health
   ```

### Problem: Container startet nicht

**Symptome:**
- `docker-compose up` zeigt Fehler
- Container ist im Status "Restarting"

**Lösung:**
1. Logs prüfen:
   ```bash
   docker-compose logs sensor-frontend
   ```

2. Port-Konflikte prüfen:
   ```bash
   sudo netstat -tulpn | grep 4200
   ```

3. Container einzeln starten:
   ```bash
   docker-compose up -d influxdb-sensor
   docker-compose up -d postgres
   docker-compose up -d quarkus-app
   docker-compose up -d sensor-frontend
   ```

## URLs

- **Sensor Dashboard**: https://vm67.htl-leonding.ac.at/sensor-data/
- **Sensor API**: https://vm67.htl-leonding.ac.at/sensor-api/
- **InfluxDB UI**: http://vm67.htl-leonding.ac.at:8087/
- **Kiosk Frontend**: https://vm67.htl-leonding.ac.at/
- **Grafana**: https://vm67.htl-leonding.ac.at/grafana/

## Environment Variables

Die `.env` Datei im `sensor-dashboard` Verzeichnis enthält:

```env
INFLUXDB_TOKEN=your-influxdb-admin-token
```

Diese muss auf der VM vorhanden sein!

## Wichtige Dateien

- `sensor-dashboard/docker-compose.yml` - Container-Konfiguration
- `sensor-dashboard/Frontend/sensor-frontend/Dockerfile` - Frontend Build
- `sensor-dashboard/Frontend/sensor-frontend/nginx.conf` - Container Nginx
- `sensor-dashboard/Frontend/sensor-frontend/angular.json` - Angular Konfiguration
- `vm67-nginx.conf` - VM Nginx Konfiguration

## Support

Bei Problemen:
1. Container-Logs prüfen
2. Nginx-Logs prüfen: `/var/log/nginx/vm67-error.log`
3. Browser-Konsole prüfen (F12)
4. Network-Tab prüfen für fehlgeschlagene Requests
