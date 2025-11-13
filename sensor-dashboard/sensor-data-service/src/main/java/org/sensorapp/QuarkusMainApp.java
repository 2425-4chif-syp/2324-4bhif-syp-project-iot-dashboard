package org.sensorapp;

import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import org.sensorapp.infrastructure.mqtt.MQTTListener;
import org.sensorapp.infrastructure.postgres.DatabaseInitializer;

@Startup
@ApplicationScoped
public class QuarkusMainApp {
    private static final Logger LOGGER = Logger.getLogger(QuarkusMainApp.class);

    @Inject
    DatabaseInitializer databaseInitializer;

    @Inject
    MQTTListener mqttListener;

    @PostConstruct
    public void init() {
        LOGGER.info("🚀 Starte Quarkus Application!");
        
        databaseInitializer.initialize();
        
        if (mqttListener != null) {
            LOGGER.info("✅ MQTTListener erfolgreich geladen!");
            mqttListener.start();
        } else {
            LOGGER.error("❌ MQTTListener konnte NICHT geladen werden!");
        }
        
        LOGGER.info("✅ Quarkus Application gestartet mit HTTP-Server!");
    }
}