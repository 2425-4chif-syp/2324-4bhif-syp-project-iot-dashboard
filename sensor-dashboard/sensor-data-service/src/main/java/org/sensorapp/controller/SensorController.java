package org.sensorapp.controller;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.sensorapp.infrastructure.influxdb.DTOs.SensorDataDTO;
import org.sensorapp.infrastructure.influxdb.DTOs.SensorValueDTO;
import org.sensorapp.infrastructure.influxdb.InfluxDBQueryService;
import org.sensorapp.infrastructure.influxdb.InfluxDBBucketService;
import org.sensorapp.infrastructure.influxdb.SensorMappingService;
import org.sensorapp.infrastructure.influxdb.DTOs.SensorRoomMappingDTO;

import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * REST API Controller zur Verwaltung von Sensordaten.
 * Stellt Endpunkte zur Verfügung, um Informationen über Stockwerke, Sensoren und deren Messwerte abzurufen.
 */
@Path("/sensors")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class SensorController {

    @Inject
    InfluxDBQueryService influxDBQueryService;
    
    @Inject
    InfluxDBBucketService influxDBBucketService;
    
    @Inject
    SensorMappingService sensorMappingService;

    private static final Logger LOGGER = Logger.getLogger(SensorController.class.getName());

    /**
     * Gibt eine Liste aller vorhandenen Stockwerke zurück.
     *
     * @param timeRange (optional) Der Zeitbereich für die Abfrage, z. B. "-30d" für die letzten 30 Tage.
     * @return Eine Liste von Stockwerksnamen oder eine Fehlerantwort bei Problemen.
     */
    @GET
    @Path("/floors")
    public Response getAllFloors(@QueryParam("timeRange") String timeRange) {
        try {
            List<String> floors = influxDBQueryService.getAllFloors(timeRange);
            if (floors.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity("Keine Stockwerke gefunden.").build();
            }
            return Response.ok(floors).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Stockwerke", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Fehler beim Abrufen der Stockwerke.").build();
        }
    }

    /**
     * Gibt eine Liste aller Sensoren in einem bestimmten Stockwerk zurück.
     *
     * @param floor     Das Stockwerk, für das die Sensoren abgerufen werden sollen.
     * @param timeRange (optional) Der Zeitbereich für die Abfrage.
     * @return Eine Liste von Sensor-IDs oder eine Fehlerantwort.
     */
    @GET
    @Path("/{floor}")
    public Response getSensorsByFloor(@PathParam("floor") String floor, @QueryParam("timeRange") String timeRange) {
        try {
            List<String> sensors = influxDBQueryService.getSensorsByFloor(floor, timeRange);
            if (sensors.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity("Keine Sensoren für Stockwerk '" + floor + "' gefunden.").build();
            }
            return Response.ok(sensors).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Sensoren für Stockwerk: " + floor, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Fehler beim Abrufen der Sensoren für Stockwerk '" + floor + "'.").build();
        }
    }

    /**
     * Gibt alle verfügbaren Messarten (Felder) eines Sensors zurück.
     *
     * @param floor     Das Stockwerk, in dem sich der Sensor befindet.
     * @param sensorId  Die ID des Sensors.
     * @param timeRange (optional) Der Zeitbereich für die Abfrage.
     * @return Eine Liste von Messarten oder eine Fehlerantwort.
     */
    @GET
    @Path("/{floor}/{sensorId}")
    public Response getSensorData(@PathParam("floor") String floor, @PathParam("sensorId") String sensorId, @QueryParam("timeRange") String timeRange) {
        try {
            Set<String> sensorData = influxDBQueryService.getSensorFields(floor, sensorId, timeRange);
            if (sensorData.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity("Keine Messdaten für Sensor '" + sensorId + "' im Stockwerk '" + floor + "' gefunden.").build();
            }
            return Response.ok(sensorData).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Sensordaten für Sensor: " + sensorId + " im Stockwerk: " + floor, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Fehler beim Abrufen der Sensordaten für Sensor '" + sensorId + "'.").build();
        }
    }

    /**
     * Gibt die letzten gemessenen Werte eines bestimmten Sensors für einen bestimmten Sensortyp zurück.
     *
     * @param floor      Das Stockwerk, in dem sich der Sensor befindet.
     * @param sensorId   Die ID des Sensors.
     * @param sensorType Der gewünschte Sensortyp (z. B. "CO2", "Temperatur").
     * @param timeRange  (optional) Der Zeitbereich für die Abfrage.
     * @return Eine Liste der gemessenen Werte als DTO oder eine Fehlerantwort.
     */
    @GET
    @Path("/{floor}/{sensorId}/{sensorType}")
    public Response getSpecificSensorValues(
            @PathParam("floor") String floor,
            @PathParam("sensorId") String sensorId,
            @PathParam("sensorType") String sensorType,
            @QueryParam("timeRange") String timeRange) {
        try {
            List<SensorValueDTO> values = influxDBQueryService.getSpecificSensorValues(floor, sensorId, sensorType, timeRange);
            if (values.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Keine Messwerte für Sensor '" + sensorId + "' mit Typ '" + sensorType + "' gefunden.")
                        .build();
            }
            return Response.ok(values).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Messwerte für Sensor: " + sensorId + " mit Typ: " + sensorType, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Abrufen der Messwerte für Sensor '" + sensorId + "'.")
                    .build();
        }
    }

    /**
     * Gibt alle Werte eines Sensors mit Zeitstempel, Sensortyp und Wert zurück.
     *
     * @param floor     Das Stockwerk, in dem sich der Sensor befindet.
     * @param sensorId  Die ID des Sensors.
     * @param timeRange (optional) Der Zeitbereich für die Abfrage.
     * @return Eine Liste der formatierten Werte als DTO oder eine Fehlerantwort.
     */
    @GET
    @Path("/{floor}/{sensorId}/values")
    public Response getAllSensorValues(
            @PathParam("floor") String floor,
            @PathParam("sensorId") String sensorId,
            @QueryParam("timeRange") String timeRange) {
        try {
            List<SensorDataDTO> sensorData = influxDBQueryService.getAllSensorValues(floor, sensorId, timeRange);
            if (sensorData.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Keine formatierten Werte für Sensor '" + sensorId + "' gefunden.")
                        .build();
            }
            return Response.ok(sensorData).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der formatierten Werte für Sensor: " + sensorId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Abrufen der formatierten Werte für Sensor '" + sensorId + "'.")
                    .build();
        }
    }

    /**
     * Erstellt einen neuen InfluxDB Bucket
     *
     * @param bucketName Name des zu erstellenden Buckets
     * @param retentionDays Anzahl der Tage für die Datenaufbewahrung (optional, default: 0 = unbegrenzt)
     * @return Response mit Erfolgsstatus
     */
    @POST
    @Path("/buckets/{bucketName}")
    public Response createBucket(
            @PathParam("bucketName") String bucketName,
            @QueryParam("retentionDays") @DefaultValue("0") int retentionDays) {
        try {
            // Verwende die Organisation aus der Konfiguration
            String orgName = "sensor_org";
            
            boolean success = influxDBBucketService.createBucket(bucketName, orgName, retentionDays);
            
            if (success) {
                LOGGER.info("Bucket '" + bucketName + "' wurde erfolgreich erstellt.");
                return Response.status(Response.Status.CREATED)
                        .entity("Bucket '" + bucketName + "' wurde erfolgreich erstellt.")
                        .build();
            } else {
                return Response.status(Response.Status.CONFLICT)
                        .entity("Bucket '" + bucketName + "' existiert bereits oder konnte nicht erstellt werden.")
                        .build();
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Erstellen des Buckets: " + bucketName, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Erstellen des Buckets '" + bucketName + "'.")
                    .build();
        }
    }

    /**
     * Listet alle verfügbaren InfluxDB Buckets auf
     *
     * @return Liste aller Bucket-Namen
     */
    @GET
    @Path("/buckets")
    public Response getAllBuckets() {
        try {
            List<String> buckets = influxDBBucketService.listAllBuckets();
            return Response.ok(buckets).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Buckets", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Abrufen der Buckets.")
                    .build();
        }
    }

    /**
     * Löscht einen InfluxDB Bucket
     *
     * @param bucketName Name des zu löschenden Buckets
     * @return Response mit Erfolgsstatus
     */
    @DELETE
    @Path("/buckets/{bucketName}")
    public Response deleteBucket(@PathParam("bucketName") String bucketName) {
        try {
            boolean success = influxDBBucketService.deleteBucket(bucketName);
            
            if (success) {
                LOGGER.info("Bucket '" + bucketName + "' wurde erfolgreich gelöscht.");
                return Response.ok("Bucket '" + bucketName + "' wurde erfolgreich gelöscht.").build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Bucket '" + bucketName + "' nicht gefunden.")
                        .build();
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Löschen des Buckets: " + bucketName, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Löschen des Buckets '" + bucketName + "'.")
                    .build();
        }
    }

    // ==================== SENSOR-ROOM MAPPING ENDPOINTS ====================

    /**
     * Gibt alle aktuellen Sensor-zu-Raum Zuordnungen zurück
     *
     * @return Liste aller Sensor-Room-Mappings
     */
    @GET
    @Path("/mappings")
    public Response getAllSensorMappings() {
        try {
            List<SensorRoomMappingDTO> mappings = sensorMappingService.getAllSensorMappings();
            return Response.ok(mappings).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Sensor-Mappings", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Abrufen der Sensor-Mappings.")
                    .build();
        }
    }

    /**
     * Speichert oder aktualisiert eine Sensor-zu-Raum Zuordnung
     *
     * @param mapping Die Sensor-Room-Mapping-Daten
     * @return Response mit Erfolgsstatus
     */
    @POST
    @Path("/mappings")
    public Response saveSensorMapping(SensorRoomMappingDTO mapping) {
        try {
            if (mapping.getSensorId() == null || mapping.getFloor() == null || mapping.getRoomId() == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("SensorId, Floor und RoomId sind erforderlich.")
                        .build();
            }

            boolean success = sensorMappingService.saveSensorMapping(mapping);
            
            if (success) {
                LOGGER.info("Sensor-Mapping gespeichert: " + mapping);
                return Response.status(Response.Status.CREATED)
                        .entity("Sensor-Mapping wurde erfolgreich gespeichert.")
                        .build();
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity("Fehler beim Speichern des Sensor-Mappings.")
                        .build();
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Speichern des Sensor-Mappings: " + mapping, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Speichern des Sensor-Mappings.")
                    .build();
        }
    }

    /**
     * Löscht eine Sensor-zu-Raum Zuordnung
     *
     * @param sensorId Die ID des Sensors
     * @param floor Das Stockwerk des Sensors
     * @return Response mit Erfolgsstatus
     */
    @DELETE
    @Path("/mappings/{floor}/{sensorId}")
    public Response removeSensorMapping(
            @PathParam("sensorId") String sensorId,
            @PathParam("floor") String floor) {
        try {
            boolean success = sensorMappingService.removeSensorMapping(sensorId, floor);
            
            if (success) {
                LOGGER.info("Sensor-Mapping entfernt: sensorId=" + sensorId + ", floor=" + floor);
                return Response.ok("Sensor-Mapping wurde erfolgreich entfernt.").build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Sensor-Mapping nicht gefunden.")
                        .build();
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Entfernen des Sensor-Mappings: sensorId=" + sensorId + ", floor=" + floor, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Entfernen des Sensor-Mappings.")
                    .build();
        }
    }

    /**
     * Findet die Raum-ID für einen bestimmten Sensor
     *
     * @param sensorId Die ID des Sensors
     * @param floor Das Stockwerk des Sensors
     * @return Die Raum-ID oder 404 falls nicht gefunden
     */
    @GET
    @Path("/mappings/{floor}/{sensorId}/room")
    public Response findRoomForSensor(
            @PathParam("sensorId") String sensorId,
            @PathParam("floor") String floor) {
        try {
            Integer roomId = sensorMappingService.findRoomForSensor(sensorId, floor);
            
            if (roomId != null) {
                return Response.ok(roomId).build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Keine Raum-Zuordnung für Sensor '" + sensorId + "' im Stockwerk '" + floor + "' gefunden.")
                        .build();
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Suchen der Raum-ID für Sensor: " + sensorId + ", floor: " + floor, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Suchen der Raum-ID.")
                    .build();
        }
    }

    /**
     * Findet alle Sensoren für einen bestimmten Raum
     *
     * @param roomId Die ID des Raums
     * @return Liste aller Sensoren in diesem Raum
     */
    @GET
    @Path("/mappings/room/{roomId}")
    public Response findSensorsForRoom(@PathParam("roomId") Integer roomId) {
        try {
            List<SensorRoomMappingDTO> sensors = sensorMappingService.findSensorsForRoom(roomId);
            return Response.ok(sensors).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Suchen der Sensoren für Raum: " + roomId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Suchen der Sensoren für Raum.")
                    .build();
        }
    }
}