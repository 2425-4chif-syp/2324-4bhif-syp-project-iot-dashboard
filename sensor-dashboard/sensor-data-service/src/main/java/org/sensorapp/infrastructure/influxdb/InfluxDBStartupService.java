package org.sensorapp.infrastructure.influxdb;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.annotation.PostConstruct;

import java.util.logging.Logger;

/**
 * Startup-Service zum automatischen Erstellen benötigter InfluxDB Buckets
 */
@ApplicationScoped 
public class InfluxDBStartupService {

    private static final Logger LOGGER = Logger.getLogger(InfluxDBStartupService.class.getName());

    @Inject
    InfluxDBBucketService bucketService;

    @PostConstruct
    public void init() {
        createRequiredBuckets();
    }

    /**
     * Erstellt alle benötigten Buckets beim Anwendungsstart
     */
    private void createRequiredBuckets() {
        String orgName = "sensor_org";
        
        // Erstelle den sensor_mappings Bucket
        createBucketIfNotExists("sensor_mappings", orgName, 0);
        
        // Weitere Buckets können hier hinzugefügt werden
        createBucketIfNotExists("sensor_bucket", orgName, 0);
    }

    /**
     * Erstellt einen Bucket, falls er noch nicht existiert
     */
    private void createBucketIfNotExists(String bucketName, String orgName, int retentionDays) {
        try {
            if (!bucketService.bucketExists(bucketName, orgName)) {
                boolean success = bucketService.createBucket(bucketName, orgName, retentionDays);
                if (success) {
                    LOGGER.info("Bucket '" + bucketName + "' wurde beim Anwendungsstart erstellt.");
                } else {
                    LOGGER.warning("Bucket '" + bucketName + "' konnte nicht erstellt werden.");
                }
            } else {
                LOGGER.info("Bucket '" + bucketName + "' existiert bereits.");
            }
        } catch (Exception e) {
            LOGGER.severe("Fehler beim Erstellen des Buckets '" + bucketName + "': " + e.getMessage());
        }
    }
}
