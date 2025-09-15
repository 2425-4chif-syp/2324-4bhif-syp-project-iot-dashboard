package org.sensorapp.infrastructure.postgres;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.logging.Logger;

@ApplicationScoped
public class DatabaseInitializer {

    @Inject
    EntityManager entityManager;

    private static final Logger LOG = Logger.getLogger("DatabaseInitializer");
    private static final String SQL_FILE_PATH = "src/main/resources/files/utils/sql/roomsInsert.sql";

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
            Log.info("Execute SQL-File: " + SQL_FILE_PATH);

            String sql = new String(Files.readAllBytes(Paths.get(SQL_FILE_PATH)));

            entityManager.createNativeQuery(sql).executeUpdate();

            Log.info("SQL-File successful executed: " + SQL_FILE_PATH);
        }
        catch (Exception e){
            Log.error("SQL-File initialization failed: " + SQL_FILE_PATH, e);
        }
    }
}
