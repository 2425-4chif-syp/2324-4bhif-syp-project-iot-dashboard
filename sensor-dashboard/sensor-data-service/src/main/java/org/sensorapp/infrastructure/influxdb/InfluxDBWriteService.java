package org.sensorapp.infrastructure.influxdb;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApi;
import com.influxdb.client.write.Point;
import com.influxdb.client.domain.WritePrecision;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.Map;
import java.util.logging.Logger;

@ApplicationScoped
public class InfluxDBWriteService {

    private static final Logger LOGGER = Logger.getLogger(InfluxDBWriteService.class.getName());
    private static final String MEASUREMENT = "sensor_data";

    @Inject
    private InfluxDBClient influxDBClient;

    /**
     * Schreibt Sensordaten in die InfluxDB
     * @param floor - Stockwerk (z.B. "eg", "ug")
     * @param sensorId - Sensor ID (z.B. "U08")
     * @param sensorData - Map mit Sensortypen und Werten (z. B. CO2, TEMP)
     * @return true, wenn erfolgreich gespeichert, false bei Fehler
     */
    public boolean writeSensorData(String floor, String sensorId, Map<String, Double> sensorData) {
        if (floor == null || floor.isEmpty() || sensorId == null || sensorId.isEmpty() || sensorData == null || sensorData.isEmpty()) {
            LOGGER.warning("⚠️ Ungültige Sensordaten!");
            return false;
        }

        try (WriteApi writeApi = influxDBClient.getWriteApi()) {
            for (Map.Entry<String, Double> entry : sensorData.entrySet()) {
                Point point = Point.measurement(MEASUREMENT)
                        .addTag("floor", floor)
                        .addTag("sensor", sensorId)
                        .addField(entry.getKey(), entry.getValue())
                        .time(Instant.now(), WritePrecision.NS);

                writeApi.writePoint(point);
                LOGGER.info("✅ Sensor-Daten geschrieben: " + entry.getKey() + " = " + entry.getValue());
            }
            return true;
        } catch (Exception e) {
            LOGGER.severe("❌ Fehler beim Schreiben der Daten: " + e.getMessage());
            return false;
        }
    }
}
