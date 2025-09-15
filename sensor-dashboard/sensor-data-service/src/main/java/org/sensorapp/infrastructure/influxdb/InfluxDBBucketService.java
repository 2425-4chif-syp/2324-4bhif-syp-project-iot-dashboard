package org.sensorapp.infrastructure.influxdb;

import com.influxdb.client.BucketsApi;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.domain.Bucket;
import com.influxdb.client.domain.BucketRetentionRules;
import com.influxdb.client.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.logging.Logger;

/**
 * Service zur Verwaltung von InfluxDB Buckets
 */
@ApplicationScoped
public class InfluxDBBucketService {

    private static final Logger LOGGER = Logger.getLogger(InfluxDBBucketService.class.getName());

    @Inject
    private InfluxDBClient influxDBClient;

    /**
     * Erstellt einen neuen Bucket in InfluxDB
     *
     * @param bucketName Name des zu erstellenden Buckets
     * @param orgName Organisation, in der der Bucket erstellt werden soll
     * @param retentionDays Anzahl der Tage, wie lange Daten gespeichert werden sollen (0 = unbegrenzt)
     * @return true wenn erfolgreich erstellt, false bei Fehler oder wenn Bucket bereits existiert
     */
    public boolean createBucket(String bucketName, String orgName, int retentionDays) {
        try {
            BucketsApi bucketsApi = influxDBClient.getBucketsApi();
            
            // Überprüfe ob Bucket bereits existiert
            if (bucketExists(bucketName, orgName)) {
                LOGGER.info("Bucket '" + bucketName + "' existiert bereits.");
                return false;
            }

            // Hole Organisation
            Organization org = influxDBClient.getOrganizationsApi().findOrganizations().stream()
                    .filter(o -> o.getName().equals(orgName))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Organisation '" + orgName + "' nicht gefunden"));

            // Erstelle Bucket
            Bucket bucket = new Bucket();
            bucket.setName(bucketName);
            bucket.setOrgID(org.getId());
            bucket.setDescription("Bucket für " + bucketName + " Daten");

            // Setze Retention Policy wenn angegeben
            if (retentionDays > 0) {
                BucketRetentionRules retentionRule = new BucketRetentionRules();
                retentionRule.setEverySeconds(retentionDays * 24 * 60 * 60); // Tage in Sekunden
                bucket.setRetentionRules(List.of(retentionRule));
            }

            Bucket createdBucket = bucketsApi.createBucket(bucket);
            LOGGER.info("Bucket '" + bucketName + "' erfolgreich erstellt mit ID: " + createdBucket.getId());
            return true;

        } catch (Exception e) {
            LOGGER.severe("Fehler beim Erstellen des Buckets '" + bucketName + "': " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Überprüft ob ein Bucket bereits existiert
     *
     * @param bucketName Name des Buckets
     * @param orgName Organisation
     * @return true wenn Bucket existiert, false wenn nicht
     */
    public boolean bucketExists(String bucketName, String orgName) {
        try {
            BucketsApi bucketsApi = influxDBClient.getBucketsApi();
            return bucketsApi.findBuckets().stream()
                    .anyMatch(bucket -> bucket.getName().equals(bucketName));
        } catch (Exception e) {
            LOGGER.severe("Fehler beim Überprüfen des Buckets '" + bucketName + "': " + e.getMessage());
            return false;
        }
    }

    /**
     * Listet alle verfügbaren Buckets auf
     *
     * @return Liste aller Bucket-Namen
     */
    public List<String> listAllBuckets() {
        try {
            BucketsApi bucketsApi = influxDBClient.getBucketsApi();
            return bucketsApi.findBuckets().stream()
                    .map(Bucket::getName)
                    .toList();
        } catch (Exception e) {
            LOGGER.severe("Fehler beim Auflisten der Buckets: " + e.getMessage());
            return List.of();
        }
    }

    /**
     * Löscht einen Bucket
     *
     * @param bucketName Name des zu löschenden Buckets
     * @return true wenn erfolgreich gelöscht, false bei Fehler
     */
    public boolean deleteBucket(String bucketName) {
        try {
            BucketsApi bucketsApi = influxDBClient.getBucketsApi();
            Bucket bucket = bucketsApi.findBuckets().stream()
                    .filter(b -> b.getName().equals(bucketName))
                    .findFirst()
                    .orElse(null);

            if (bucket != null) {
                bucketsApi.deleteBucket(bucket);
                LOGGER.info("Bucket '" + bucketName + "' erfolgreich gelöscht.");
                return true;
            } else {
                LOGGER.warning("Bucket '" + bucketName + "' nicht gefunden.");
                return false;
            }
        } catch (Exception e) {
            LOGGER.severe("Fehler beim Löschen des Buckets '" + bucketName + "': " + e.getMessage());
            return false;
        }
    }
}
