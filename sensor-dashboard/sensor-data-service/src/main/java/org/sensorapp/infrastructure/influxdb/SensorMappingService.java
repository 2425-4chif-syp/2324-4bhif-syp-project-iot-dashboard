package org.sensorapp.infrastructure.influxdb;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import com.influxdb.client.WriteApi;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.sensorapp.infrastructure.influxdb.DTOs.SensorRoomMappingDTO;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Service für die Verwaltung von Sensor-zu-Raum Zuordnungen in InfluxDB
 */
@ApplicationScoped
public class SensorMappingService {

    private static final Logger LOGGER = Logger.getLogger(SensorMappingService.class.getName());
    private static final String MEASUREMENT_NAME = "sensor_room_mapping";
    private static final String BUCKET_NAME = "sensor_mappings";

    @Inject
    InfluxDBClient influxDBClient;

    @ConfigProperty(name = "influxdb.org")
    String organization;

    /**
     * Speichert oder aktualisiert eine Sensor-zu-Raum Zuordnung in InfluxDB
     */
    public boolean saveSensorMapping(SensorRoomMappingDTO mapping) {
        try {
            // Zuerst das alte Mapping löschen, falls vorhanden
            removeSensorMapping(mapping.getSensorId(), mapping.getFloor());
            
            // Neues Mapping speichern
            Point point = Point.measurement(MEASUREMENT_NAME)
                    .addTag("sensorId", mapping.getSensorId())
                    .addTag("floor", mapping.getFloor())
                    .addField("roomId", mapping.getRoomId())
                    .time(Instant.now(), WritePrecision.NS);

            try (WriteApi writeApi = influxDBClient.getWriteApi()) {
                writeApi.writePoint(BUCKET_NAME, organization, point);
                LOGGER.info("Sensor-Mapping gespeichert: " + mapping);
                return true;
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Speichern des Sensor-Mappings: " + mapping, e);
            return false;
        }
    }

    /**
     * Lädt alle aktuellen Sensor-zu-Raum Zuordnungen aus InfluxDB
     */
    public List<SensorRoomMappingDTO> getAllSensorMappings() {
        List<SensorRoomMappingDTO> mappings = new ArrayList<>();
        
        try {
            String flux = String.format("""
                from(bucket: "%s")
                |> range(start: 0)
                |> filter(fn: (r) => r._measurement == "%s")
                |> group(columns: ["sensorId", "floor"])
                |> last()
                |> drop(columns: ["_start", "_stop"])
                """, BUCKET_NAME, MEASUREMENT_NAME);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(flux, organization);
            
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    try {
                        String sensorId = (String) record.getValueByKey("sensorId");
                        String floor = (String) record.getValueByKey("floor");
                        Integer roomId = null;
                        
                        Object roomIdValue = record.getValue();
                        if (roomIdValue instanceof Number) {
                            roomId = ((Number) roomIdValue).intValue();
                        }
                        
                        Instant timestamp = record.getTime();
                        String timestampStr = timestamp != null ? timestamp.toString() : Instant.now().toString();
                        
                        if (sensorId != null && floor != null && roomId != null) {
                            mappings.add(new SensorRoomMappingDTO(sensorId, floor, roomId, timestampStr));
                        }
                    } catch (Exception e) {
                        LOGGER.log(Level.WARNING, "Fehler beim Verarbeiten eines Mapping-Records", e);
                    }
                }
            }
            
            LOGGER.info("Loaded " + mappings.size() + " sensor mappings from InfluxDB");
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Laden der Sensor-Mappings", e);
        }
        
        return mappings;
    }

    /**
     * Entfernt eine Sensor-zu-Raum Zuordnung aus InfluxDB
     */
    public boolean removeSensorMapping(String sensorId, String floor) {
        try {
            // InfluxDB Delete API verwenden mit OffsetDateTime
            influxDBClient.getDeleteApi().delete(
                java.time.OffsetDateTime.now().minusYears(10),  // Weit in der Vergangenheit
                java.time.OffsetDateTime.now(),                  // Jetzt
                String.format("_measurement=\"%s\" AND sensorId=\"%s\" AND floor=\"%s\"", 
                    MEASUREMENT_NAME, sensorId, floor),
                BUCKET_NAME,
                organization
            );
            
            LOGGER.info("Sensor-Mapping entfernt: sensorId=" + sensorId + ", floor=" + floor);
            return true;
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Entfernen des Sensor-Mappings: sensorId=" + sensorId + ", floor=" + floor, e);
            return false;
        }
    }

    /**
     * Findet die Raum-ID für einen bestimmten Sensor
     */
    public Integer findRoomForSensor(String sensorId, String floor) {
        try {
            String flux = String.format("""
                from(bucket: "%s")
                |> range(start: 0)
                |> filter(fn: (r) => r._measurement == "%s")
                |> filter(fn: (r) => r.sensorId == "%s")
                |> filter(fn: (r) => r.floor == "%s")
                |> last()
                """, BUCKET_NAME, MEASUREMENT_NAME, sensorId, floor);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(flux, organization);
            
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    Object roomIdValue = record.getValue();
                    if (roomIdValue instanceof Number) {
                        return ((Number) roomIdValue).intValue();
                    }
                }
            }
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Suchen der Raum-ID für Sensor: " + sensorId + ", floor: " + floor, e);
        }
        
        return null;
    }

    /**
     * Findet alle Sensoren für einen bestimmten Raum
     */
    public List<SensorRoomMappingDTO> findSensorsForRoom(Integer roomId) {
        List<SensorRoomMappingDTO> sensorsForRoom = new ArrayList<>();
        
        try {
            String flux = String.format("""
                from(bucket: "%s")
                |> range(start: 0)
                |> filter(fn: (r) => r._measurement == "%s")
                |> filter(fn: (r) => r._value == %d)
                |> group(columns: ["sensorId", "floor"])
                |> last()
                """, BUCKET_NAME, MEASUREMENT_NAME, roomId);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(flux, organization);
            
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    try {
                        String sensorId = (String) record.getValueByKey("sensorId");
                        String floor = (String) record.getValueByKey("floor");
                        Instant timestamp = record.getTime();
                        String timestampStr = timestamp != null ? timestamp.toString() : Instant.now().toString();
                        
                        if (sensorId != null && floor != null) {
                            sensorsForRoom.add(new SensorRoomMappingDTO(sensorId, floor, roomId, timestampStr));
                        }
                    } catch (Exception e) {
                        LOGGER.log(Level.WARNING, "Fehler beim Verarbeiten eines Sensor-Records für Raum " + roomId, e);
                    }
                }
            }
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Suchen der Sensoren für Raum: " + roomId, e);
        }
        
        return sensorsForRoom;
    }
}
