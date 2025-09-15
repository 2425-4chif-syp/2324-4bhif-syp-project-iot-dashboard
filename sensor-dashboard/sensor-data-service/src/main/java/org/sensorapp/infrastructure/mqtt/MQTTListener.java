package org.sensorapp.infrastructure.mqtt;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.quarkus.arc.Unremovable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.paho.client.mqttv3.*;
import org.sensorapp.infrastructure.influxdb.InfluxDBWriteService;

import javax.net.ssl.SSLSocketFactory;
import java.nio.charset.StandardCharsets;
import java.util.logging.Logger;
import java.util.HashMap;
import java.util.Map;

@Unremovable
@ApplicationScoped
public class MQTTListener {

    private static final Logger LOGGER = Logger.getLogger(MQTTListener.class.getName());

    private static final String BROKER_URL = "ssl://mqtt.htl-leonding.ac.at:8883";
    private static final String CLIENT_ID = "quarkus-sensor-client1";
    private static final String USERNAME = "leo-student";
    private static final String PASSWORD = "sTuD@w0rck";

    // Add specific topics for tupper_box and plug-in_box
    private static final String[] TOPICS = {
        "+/+/+/+",      // General format for nested topics
        "+/+/+",        // General format for 3-level topics
        "ug/#",         // All messages from ug floor
        "eg/#",         // All messages from eg floor
        "tupper_box_v1/#",  // All messages from tupper_box_v1
        "plug-in_box/#"     // All messages from plug-in_box
    };

    private MqttClient client;

    @Inject
    InfluxDBWriteService influxDBWriteService;

    public void start() {
        LOGGER.info("🚀 MQTTListener wird gestartet...");
        new Thread(this::connectMQTT).start();
    }

    private void connectMQTT() {
        while (true) {
            try {
                if (client == null || !client.isConnected()) {
                    LOGGER.info("🔌 Versuche Verbindung zum MQTT-Broker: " + BROKER_URL);
                    client = new MqttClient(BROKER_URL, CLIENT_ID, null);

                    MqttConnectOptions options = new MqttConnectOptions();
                    options.setUserName(USERNAME);
                    options.setPassword(PASSWORD.toCharArray());
                    options.setSocketFactory(SSLSocketFactory.getDefault());
                    options.setCleanSession(true);
                    options.setAutomaticReconnect(true);

                    client.connect(options);
                    LOGGER.info("✅ Erfolgreich mit MQTT verbunden.");

                    // Themen abonnieren
                    for (String topic : TOPICS) {
                        LOGGER.info("📡 Abonniere Topic: " + topic);
                        client.subscribe(topic, this::handleMessage);
                    }
                }
                break;
            } catch (MqttException e) {
                LOGGER.warning("❌ MQTT-Verbindung fehlgeschlagen, erneuter Versuch in 5 Sekunden: " + e.getMessage());
                try {
                    Thread.sleep(5000);
                } catch (InterruptedException ignored) {}
            }
        }
    }

    private void handleMessage(String topic, MqttMessage message) {
        String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
        LOGGER.info("📩 MQTT Nachricht empfangen - Topic: " + topic + ", Payload: " + payload);

        // Das Topic in Teile zerlegen
        String[] topicParts = topic.split("/");
        if (topicParts.length < 2) {
            LOGGER.warning("⚠️ Ungültiges Topic-Format: " + topic);
            return;
        }

        // Parse floor, sensorId and sensorType from the topic
        String floor, sensorId, sensorType;
        
        // Special handling for tupper_box and plug-in_box sensors
        if (topic.startsWith("tupper_box_v1/") || topic.startsWith("plug-in_box/")) {
            // For tupper_box_v1 and plug-in_box, the format is different:
            // e.g. tupper_box_v1/sensor/tupper_box_v1_temperature/state
            floor = "sensors"; // Use a generic floor name for these sensors
            sensorId = topicParts[0]; // e.g., tupper_box_v1 or plug-in_box
            
            // Extract the sensor type from the topic
            if (topicParts.length >= 3) {
                String fullSensorName = topicParts[2]; // e.g., tupper_box_v1_temperature
                
                // Normalize sensor type names - only care about temperature, humidity, and co2
                if (fullSensorName.contains("temperature")) {
                    sensorType = "temperature";
                } else if (fullSensorName.contains("humidity")) {
                    sensorType = "humidity";
                } else if (fullSensorName.contains("co2")) {
                    sensorType = "co2";
                } else {
                    // Skip other sensor types we're not interested in
                    LOGGER.info("⏭️ Überspringe nicht benötigten Sensortyp: " + fullSensorName);
                    return;
                }
            } else {
                // If topic structure is unexpected, try to guess the sensor type from the payload
                if (topic.contains("temperature")) {
                    sensorType = "temperature";
                } else if (topic.contains("humidity")) {
                    sensorType = "humidity";
                } else if (topic.contains("co2")) {
                    sensorType = "co2";
                } else {
                    // Skip unknown sensor types
                    LOGGER.info("⏭️ Überspringe unbekannten Sensortyp: " + topic);
                    return;
                }
            }
        } else if (topicParts.length >= 3) {
            // Standard format: floor/sensorId/sensorType
            floor = topicParts[0];  // e.g., eg, ug
            sensorId = topicParts[1]; // e.g., U08, U90
            sensorType = topicParts[2]; // e.g., CO2, HUM, TEMP
            
            // Normalize sensorType for consistent database storage
            sensorType = normalizeSensorType(sensorType);
            
            // Skip sensor types we don't care about
            if (!sensorType.equals("co2") && !sensorType.equals("temperature") && !sensorType.equals("humidity")) {
                LOGGER.info("⏭️ Überspringe nicht benötigten Sensortyp: " + sensorType);
                return;
            }
        } else {
            LOGGER.warning("⚠️ Konnte Sensormetadaten nicht aus Topic extrahieren: " + topic);
            return;
        }

        Map<String, Double> sensorData = new HashMap<>();

        // JSON-Parsing oder einfacher Wert
        try {
            if (payload.startsWith("{") && payload.endsWith("}")) {
                // JSON-Payload parsen
                JsonObject jsonObject = JsonParser.parseString(payload).getAsJsonObject();
                if (jsonObject.has("value")) {
                    double sensorValue = jsonObject.get("value").getAsDouble();
                    sensorData.put(sensorType, sensorValue);
                    LOGGER.info("✅ JSON-Wert für " + sensorType + " gespeichert: " + sensorValue);
                } else if (jsonObject.has("state")) {
                    // Some devices use "state" instead of "value"
                    double sensorValue = jsonObject.get("state").getAsDouble();
                    sensorData.put(sensorType, sensorValue);
                    LOGGER.info("✅ JSON-State-Wert für " + sensorType + " gespeichert: " + sensorValue);
                } else {
                    LOGGER.warning("⚠️ Kein 'value' oder 'state' Feld im JSON-Payload gefunden: " + payload);
                }
            } else {
                // Einfache Zahl
                try {
                    double sensorValue = Double.parseDouble(payload.trim());
                    sensorData.put(sensorType, sensorValue);
                    LOGGER.info("✅ Einfacher Wert für " + sensorType + " gespeichert: " + sensorValue);
                } catch (NumberFormatException e) {
                    // Maybe it's a string value that represents state?
                    LOGGER.warning("⚠️ Payload ist keine gültige Zahl: " + payload);
                    return;
                }
            }

            // Daten in InfluxDB speichern
            if (!sensorData.isEmpty()) {
                influxDBWriteService.writeSensorData(floor, sensorId, sensorData);
                LOGGER.info("✅ Daten gespeichert für Floor: " + floor + ", Sensor: " + sensorId + ", Type: " + sensorType);
            } else {
                LOGGER.warning("⚠️ Keine Daten zum Speichern gefunden: " + payload);
            }
        } catch (Exception e) {
            LOGGER.warning("❌ Fehler beim Verarbeiten des Payloads: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Normalizes sensor type names for consistent database storage
     */
    private String normalizeSensorType(String sensorType) {
        sensorType = sensorType.toLowerCase();
        
        if (sensorType.equals("temp") || sensorType.equals("temperature")) {
            return "temperature";
        } else if (sensorType.equals("hum") || sensorType.equals("humidity")) {
            return "humidity";
        } else if (sensorType.equals("co2")) {
            return "co2";
        } else {
            return sensorType;
        }
    }
}