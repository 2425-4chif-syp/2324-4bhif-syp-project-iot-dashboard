package org.sensorapp;

import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.QuarkusApplication;
import io.quarkus.runtime.annotations.QuarkusMain;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import org.flywaydb.core.internal.database.base.Database;
import org.jboss.logging.Logger;
import org.sensorapp.infrastructure.mqtt.MQTTListener;
import org.sensorapp.infrastructure.postgres.DatabaseInitializer;

@QuarkusMain
public class QuarkusMainApp {
    private static final Logger LOGGER = Logger.getLogger(QuarkusMainApp.class);

    public static void main(String... args) {
        LOGGER.info("🚀 Starte Quarkus Main!");
        Quarkus.run(MainApp.class, args);
    }

    @ApplicationScoped
    public static class MainApp implements QuarkusApplication {

        @Inject
        DatabaseInitializer databaseInitializer;

        @Override
        public int run(String... args) {
            LOGGER.info("✅ Quarkus Main-App gestartet!");

            databaseInitializer.initialize();
            try {
                // Beans manuell abrufen
                MQTTListener mqttListener = CDI.current().select(MQTTListener.class).get();

                if (mqttListener != null) {
                    LOGGER.info("✅ MQTTListener erfolgreich geladen!");
                    mqttListener.start();
                } else {
                    LOGGER.error("❌ MQTTListener konnte NICHT geladen werden!");
                }
            } catch (Exception e) {
                LOGGER.error("❌ Fehler beim Initialisieren des MQTTListeners: " + e.getMessage());
            }

            // Quarkus laufen lassen
            Quarkus.waitForExit();
            return 0;
        }
    }
}