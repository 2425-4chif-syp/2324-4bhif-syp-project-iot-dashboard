package org.sensorapp;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApi;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.logging.Logger;

@Path("/test-data")
public class TestDataGenerator {

    private static final Logger LOGGER = Logger.getLogger(TestDataGenerator.class.getName());

    @Inject
    InfluxDBClient influxDBClient;

    @ConfigProperty(name = "influxdb.bucket")
    String bucket;

    @ConfigProperty(name = "influxdb.org")
    String organization;

    private final Random random = new Random();

    /**
     * Generiert Test-Sensordaten für verschiedene Stockwerke
     * Aufruf: GET /test-data/generate
     */
    @GET
    @Path("/generate")
    @Produces(MediaType.APPLICATION_JSON)
    public Response generateTestData() {
        try {
            List<String> createdSensors = new ArrayList<>();
            
            // Sensoren für verschiedene Stockwerke erstellen
            String[] floors = {"U", "E", "1", "2"}; // Basement, Ground, First, Second
            int sensorsPerFloor = 5;

            try (WriteApi writeApi = influxDBClient.getWriteApi()) {
                for (String floor : floors) {
                    for (int i = 1; i <= sensorsPerFloor; i++) {
                        String sensorId = "SENSOR_" + floor + String.format("%02d", i);
                        
                        // Generiere Test-Daten für die letzten 24 Stunden
                        Instant now = Instant.now();
                        
                        // Temperatur (18-26°C)
                        double temperature = 18 + random.nextDouble() * 8;
                        Point tempPoint = Point
                            .measurement("temperature")
                            .addTag("sensor_id", sensorId)
                            .addTag("floor", floor)
                            .addField("value", temperature)
                            .time(now, WritePrecision.NS);
                        writeApi.writePoint(bucket, organization, tempPoint);
                        
                        // Luftfeuchtigkeit (30-70%)
                        double humidity = 30 + random.nextDouble() * 40;
                        Point humidityPoint = Point
                            .measurement("humidity")
                            .addTag("sensor_id", sensorId)
                            .addTag("floor", floor)
                            .addField("value", humidity)
                            .time(now, WritePrecision.NS);
                        writeApi.writePoint(bucket, organization, humidityPoint);
                        
                        // CO2 (400-1200 ppm)
                        double co2 = 400 + random.nextDouble() * 800;
                        Point co2Point = Point
                            .measurement("co2")
                            .addTag("sensor_id", sensorId)
                            .addTag("floor", floor)
                            .addField("value", co2)
                            .time(now, WritePrecision.NS);
                        writeApi.writePoint(bucket, organization, co2Point);
                        
                        createdSensors.add(sensorId + " (Floor: " + floor + ")");
                    }
                }
                
                writeApi.flush();
            }
            
            LOGGER.info("Test-Daten erfolgreich generiert für " + createdSensors.size() + " Sensoren");
            
            return Response.ok()
                .entity("{ \"status\": \"success\", \"sensorsCreated\": " + createdSensors.size() + ", \"sensors\": " + createdSensors + " }")
                .build();
                
        } catch (Exception e) {
            LOGGER.severe("Fehler beim Generieren der Test-Daten: " + e.getMessage());
            e.printStackTrace();
            return Response.serverError()
                .entity("{ \"status\": \"error\", \"message\": \"" + e.getMessage() + "\" }")
                .build();
        }
    }
}
