package org.sensorapp.infrastructure.influxdb;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.sensorapp.infrastructure.influxdb.DTOs.SensorValueDTO;
import org.sensorapp.infrastructure.influxdb.DTOs.SensorDataDTO;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.logging.Logger;

@ApplicationScoped
public class InfluxDBQueryService {

    private static final Logger LOGGER = Logger.getLogger(InfluxDBQueryService.class.getName());

    @Inject
    private InfluxDBClient influxDBClient;

    /**
     * Gibt alle Stockwerke zurück
     */
    public List<String> getAllFloors(String timeRange) {
        if (timeRange == null || timeRange.isEmpty()) {
            timeRange = "-30d"; // Standardwert setzen
        }

        QueryApi queryApi = influxDBClient.getQueryApi();

        String query = String.format(
                "from(bucket: \"sensor-data\") " +
                        "|> range(start: %s) " +
                        "|> filter(fn: (r) => exists r.floor) " +
                        "|> keep(columns: [\"floor\"]) " +
                        "|> distinct(column: \"floor\")",
                timeRange
        );

        try {
            String rawResponse = queryApi.queryRaw(query);

            if (rawResponse.isEmpty()) {
                return Collections.emptyList();
            }

            return Arrays.stream(rawResponse.split("\n"))
                    .skip(1)
                    .map(line -> {
                        String[] columns = line.split(",");
                        return columns.length >= 4 ? columns[3].trim() : "";
                    })
                    .filter(floor -> !floor.isEmpty())
                    .toList();

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    /**
     * Gibt alle Sensoren eines Stockwerks zurück
     */
    public List<String> getSensorsByFloor(String floor, String timeRange) {
        timeRange = (timeRange == null || timeRange.isEmpty()) ? "-30d" : timeRange;

        QueryApi queryApi = influxDBClient.getQueryApi();
        String query = String.format(
                "from(bucket: \"sensor-data\") " +
                        "|> range(start: %s) " +
                        "|> filter(fn: (r) => r[\"floor\"] == \"%s\") " + // Filter für 'floor'
                        "|> keep(columns: [\"sensor\"]) " + // Nur die Spalte '_value' behalten
                        "|> distinct(column: \"sensor\")", // Eindeutige Werte der Spalte '_value'
                timeRange, floor
        );

        System.out.println("Executing Query: " + query);

        try {
            // Abrufen der Rohdaten
            String rawResponse = queryApi.queryRaw(query);
            // Überprüfen, ob die Antwort leere oder unerwartete Daten enthält
            if (rawResponse.isEmpty()) {
                return Collections.emptyList();
            }
            // Debug: Rohdaten zeilenweise ausgeben
            String[] lines = rawResponse.split("\n");
            // Verarbeitung der Rohdaten: Überspringe Header und extrahiere den _value-Wert (sensorwert)
            List<String> sensors = Arrays.stream(lines)
                    .skip(1) // Überspringe Header-Zeile
                    .map(line -> {
                        String[] columns = line.split(",");
                        if (columns.length > 3) { // Überprüfe, ob es genügend Spalten gibt
                            return columns[3].trim(); // Holen Sie sich den Wert aus der Spalte '_value'
                        }
                        return "";
                    })
                    .filter(sensor -> !sensor.isEmpty()) // Leere Werte entfernen
                    .toList();

            return sensors;

        } catch (Exception e) {
            System.err.println("Error while fetching sensors for floor: " + floor);
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    /**
     * Gibt alle Daten eines Sensors zurück
     */
    public Set<String> getSensorFields(String floor, String sensorId, String timeRange) {
        // Setze das Standard-Zeitintervall auf die letzten 30 Tage, wenn kein Zeitbereich angegeben wird
        timeRange = (timeRange == null || timeRange.isEmpty()) ? "-30d" : timeRange;

        QueryApi queryApi = influxDBClient.getQueryApi();
        // Abfrage: Hole eindeutige Feldnamen für die Sensor/Floor-Kombination
        String query = String.format(
                "from(bucket: \"sensor-data\") " +
                        "|> range(start: %s) " +
                        "|> filter(fn: (r) => r[\"_measurement\"] == \"sensor_data\") " +
                        "|> filter(fn: (r) => r[\"floor\"] == \"%s\") " +
                        "|> filter(fn: (r) => r[\"sensor\"] == \"%s\") " +
                        "|> keep(columns: [\"_field\"]) " +   // Behalte nur die Feld-Spalte
                        "|> distinct(column: \"_field\")",    // Hole eindeutige Feldnamen
                timeRange, floor, sensorId
        );

        System.out.println("Executing Query: " + query);

        try {
            // Abrufen der Rohdaten
            String rawResponse = queryApi.queryRaw(query);

            if (rawResponse == null || rawResponse.isEmpty()) {
                System.err.println("No data found for floor: " + floor + " and sensorId: " + sensorId);
                return Collections.emptySet();
            }

            System.out.println("Raw Response: " + rawResponse);

            Set<String> fields = new HashSet<>();
            String[] lines = rawResponse.split("\n");
            int fieldIndex = -1;

            for (int i = 0; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.isEmpty()) continue;

                // Header-Zeile verarbeiten
                if (i == 0) {
                    String[] headers = line.split(",");
                    for (int j = 0; j < headers.length; j++) {
                        if ("_field".equals(headers[j].trim())) {
                            fieldIndex = j;
                            break;
                        }
                    }
                    continue;
                }

                // Datenzeilen verarbeiten
                if (fieldIndex == -1) continue; // Header nicht gefunden

                String[] columns = line.split(",");
                if (columns.length > fieldIndex) {
                    String fieldName = columns[fieldIndex].trim();
                    if (!fieldName.isEmpty()) {
                        fields.add(fieldName);
                    }
                }
            }

            return fields;

        } catch (Exception e) {
            System.err.println("Error while fetching sensor data for floor: " + floor + " and sensorId: " + sensorId);
            e.printStackTrace();
            return Collections.emptySet();
        }
    }

    /**
     * Gibt alle spezifischen Werte eines Sensors mit Zeitstempel zurück.
     */
    public List<SensorValueDTO> getSpecificSensorValues(String floor, String sensorId, String sensorType, String timeRange) {
        // Standardwert auf 6 Stunden setzen, falls kein Zeitbereich angegeben wurde
        timeRange = (timeRange == null || timeRange.isEmpty()) ? "-6h" : timeRange;

        QueryApi queryApi = influxDBClient.getQueryApi();

        // InfluxDB Flux Query (mit _time und _value)
        String query = String.format(
                "from(bucket: \"sensor-data\") " +
                        "|> range(start: %s) " +
                        "|> filter(fn: (r) => r[\"_measurement\"] == \"sensor_data\") " +
                        "|> filter(fn: (r) => r[\"floor\"] == \"%s\") " +
                        "|> filter(fn: (r) => r[\"sensor\"] == \"%s\") " +
                        "|> filter(fn: (r) => r[\"_field\"] == \"%s\") " +
                        "|> keep(columns: [\"_time\", \"_value\"])", // Behalte Zeitstempel und Wert
                timeRange, floor, sensorId, sensorType
        );

        System.out.println("Executing Query: " + query);

        try {
            // Abrufen der Rohdaten
            String rawResponse = queryApi.queryRaw(query);

            if (rawResponse == null || rawResponse.isEmpty()) {
                System.err.println("No data found for floor: " + floor + ", sensorId: " + sensorId + ", and sensorType: " + sensorType);
                return Collections.emptyList();
            }

            System.out.println("Raw Response: " + rawResponse);

            List<SensorValueDTO> sensorValues = new ArrayList<>();
            String[] lines = rawResponse.split("\n");
            int valueIndex = -1;
            int timeIndex = -1;

            for (int i = 0; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.isEmpty()) continue;

                // Header-Zeile verarbeiten
                if (i == 0) {
                    String[] headers = line.split(",");
                    for (int j = 0; j < headers.length; j++) {
                        if ("_value".equals(headers[j].trim())) valueIndex = j;
                        if ("_time".equals(headers[j].trim())) timeIndex = j;
                    }
                    continue;
                }

                // Datenzeilen verarbeiten
                if (valueIndex == -1 || timeIndex == -1) continue; // Header nicht gefunden

                String[] columns = line.split(",");
                if (columns.length > valueIndex && columns.length > timeIndex) {
                    String valueStr = columns[valueIndex].trim();
                    String timeStr = columns[timeIndex].trim();
                    if (!valueStr.isEmpty()) {
                        try {
                            double sensorValue = Double.parseDouble(valueStr);
                            Instant timestamp = Instant.parse(timeStr); // String zu Instant konvertieren
                            sensorValues.add(new SensorValueDTO(timestamp, sensorValue));
                        } catch (NumberFormatException e) {
                            System.err.println("Failed to parse value: " + valueStr);
                        } catch (DateTimeParseException e) {
                            System.err.println("Failed to parse timestamp: " + timeStr);
                        }
                    }
                }
            }

            if (sensorValues.isEmpty()) {
                System.err.println("No valid values found for floor: " + floor + ", sensorId: " + sensorId + ", and sensorType: " + sensorType);
            }

            return sensorValues;

        } catch (Exception e) {
            System.err.println("Error while fetching sensor data for floor: " + floor + ", sensorId: " + sensorId + ", and sensorType: " + sensorType);
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    /**
     * Gibt alle Werte eines Sensors mit Bezeichnung und Zeitstempel zurück.
     * Liefert ALLE Werte für ALLE Sensor-Typen (_field).
     */
    public List<SensorDataDTO> getAllSensorValues(String floor, String sensorId, String timeRange) {
        // Standardwert auf 6 Stunden setzen, falls kein Zeitbereich angegeben wurde
        timeRange = (timeRange == null || timeRange.isEmpty()) ? "-6h" : timeRange;

        QueryApi queryApi = influxDBClient.getQueryApi();

        // InfluxDB Flux Query, um alle Werte mit _time, _field (Sensortyp) und _value zu erhalten
        String query = String.format(
                "from(bucket: \"sensor-data\") " +
                        "|> range(start: %s) " +
                        "|> filter(fn: (r) => r[\"_measurement\"] == \"sensor_data\") " +
                        "|> filter(fn: (r) => r[\"floor\"] == \"%s\") " +
                        "|> filter(fn: (r) => r[\"sensor\"] == \"%s\") " +
                        "|> keep(columns: [\"_time\", \"_field\", \"_value\"])", // Behalte Zeitstempel, Sensortyp und Wert
                timeRange, floor, sensorId
        );

        try {
            String rawResponse = queryApi.queryRaw(query);

            if (rawResponse.isEmpty()) {
                System.err.println("No data found for floor: " + floor + ", sensorId: " + sensorId);
                return Collections.emptyList();
            }

            List<SensorDataDTO> sensorValues = new ArrayList<>();
            String[] lines = rawResponse.split("\n");
            int valueIndex = -1;
            int timeIndex = -1;
            int fieldIndex = -1;

            for (int i = 0; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.isEmpty()) continue;

                // Header-Zeile verarbeiten
                if (i == 0) {
                    String[] headers = line.split(",");
                    for (int j = 0; j < headers.length; j++) {
                        if ("_value".equals(headers[j].trim())) valueIndex = j;
                        if ("_time".equals(headers[j].trim())) timeIndex = j;
                        if ("_field".equals(headers[j].trim())) fieldIndex = j;
                    }
                    continue;
                }

                // Datenzeilen verarbeiten
                if (valueIndex == -1 || timeIndex == -1 || fieldIndex == -1) continue; // Header nicht gefunden

                String[] columns = line.split(",");
                if (columns.length > valueIndex && columns.length > timeIndex && columns.length > fieldIndex) {
                    String valueStr = columns[valueIndex].trim();
                    String timeStr = columns[timeIndex].trim();
                    String fieldStr = columns[fieldIndex].trim(); // Sensortyp (z. B. CO2, Temperatur)

                    if (!valueStr.isEmpty()) {
                        try {
                            double sensorValue = Double.parseDouble(valueStr);
                            Instant timestamp = Instant.parse(timeStr); // Zeitstempel als Instant speichern
                            sensorValues.add(new SensorDataDTO(timestamp, fieldStr, sensorValue));
                        } catch (NumberFormatException e) {
                            System.err.println("Failed to parse value: " + valueStr);
                        } catch (DateTimeParseException e) {
                            System.err.println("Failed to parse timestamp: " + timeStr);
                        }
                    }
                }
            }

            if (sensorValues.isEmpty()) {
                System.err.println("No valid values found for floor: " + floor + ", sensorId: " + sensorId);
            }

            return sensorValues;

        } catch (Exception e) {
            System.err.println("Error while fetching sensor data for floor: " + floor + ", sensorId: " + sensorId);
            e.printStackTrace();
            return Collections.emptyList();
        }
    }
}