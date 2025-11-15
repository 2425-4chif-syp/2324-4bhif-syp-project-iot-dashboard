package org.sensorapp.infrastructure.postgres;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.logging.Logger;

@ApplicationScoped
public class DatabaseInitializer {

    @Inject
    EntityManager entityManager;

    private static final Logger LOG = Logger.getLogger("DatabaseInitializer");
    private static final String SQL_FILE_PATH = "files/utils/sql/roomsInsert.sql";

    @Transactional
    public void initialize() {
        Log.info("Initializing Quarkus Database");

        Query query = entityManager.createNativeQuery("Select COUNT(*) from room");
        long count = ((Number) query.getSingleResult()).longValue();

        if(count == 0) {
            Log.info("No room records found. Initializing Room Database.");
            initializeDatabase();
            Log.info("Room Database initialized");
        }
        else {
            Log.info("Room Database already initialized");
        }
    }

    @Transactional
    public void initializeDatabase() {
        try {
            Log.info("Execute SQL-File from classpath: " + SQL_FILE_PATH);

            // Read SQL file from classpath (works in JAR/Docker)
            InputStream inputStream = getClass().getClassLoader().getResourceAsStream(SQL_FILE_PATH);
            if (inputStream == null) {
                Log.error("SQL-File not found in classpath: " + SQL_FILE_PATH);
                return;
            }
            
            String sql = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

            entityManager.createNativeQuery(sql).executeUpdate();

            Log.info("SQL-File successful executed: " + SQL_FILE_PATH);
        }
        catch (Exception e){
            Log.error("SQL-File initialization failed: " + SQL_FILE_PATH, e);
        }
    }
}
