# Sensor Dashboard Docker Setup

## Erste Einrichtung

1. **Environment-Variablen konfigurieren:**
   ```bash
   cp .env.example .env
   # Bearbeite die .env Datei und setze die korrekten Werte
   ```

2. **InfluxDB Token generieren:**
   ```bash
   # Starte nur InfluxDB zuerst
   docker-compose up influxdb-sensor -d
   
   # Warte bis InfluxDB läuft, dann generiere einen Token
   docker exec -it influxdb-sensor influx auth create \
     --org sensor-org \
     --all-access \
     --description "Backend API Token"
   
   # Kopiere den generierten Token und füge ihn in die .env Datei ein
   ```

3. **Quarkus Backend bauen:**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

4. **Alle Services starten:**
   ```bash
   docker-compose up -d
   ```

## Services

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8081
- **InfluxDB**: http://localhost:8086 (admin:adminpassword)

## Für Cloud VM Deployment

1. **Ports anpassen** (falls erforderlich):
   - Frontend: Port 4200 → dein gewünschter Port
   - Backend: Port 8081 → dein gewünschter Port
   - InfluxDB: Port 8086 → dein gewünschter Port

2. **Firewall-Regeln** einrichten für die gewählten Ports

3. **SSL/HTTPS** über Reverse Proxy (Nginx/Apache) einrichten

## Nützliche Befehle

```bash
# Alle Services starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services neu starten
docker-compose restart

# Services stoppen
docker-compose down

# Alles löschen (inkl. Volumes)
docker-compose down -v
```
