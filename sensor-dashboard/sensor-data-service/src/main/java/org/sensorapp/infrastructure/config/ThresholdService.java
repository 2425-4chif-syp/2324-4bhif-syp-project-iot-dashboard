package org.sensorapp.infrastructure.config;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Service zur Verwaltung von Sensor-Schwellenwerten.
 * Stellt Funktionen zum Abrufen und Aktualisieren von Schwellenwerten bereit.
 */
@ApplicationScoped
public class ThresholdService {

    @Inject
    ThresholdConfig thresholdConfig;
    
    private static final Logger LOGGER = Logger.getLogger(ThresholdService.class.getName());

    /**
     * Gibt alle konfigurierten Schwellenwerte zurück.
     * 
     * @return ThresholdConfig mit allen Schwellenwerten
     */
    public ThresholdConfig getThresholds() {
        return thresholdConfig;
    }

    /**
     * Gibt die Schwellenwerte für einen bestimmten Sensortyp zurück.
     * 
     * @param sensorType Der Sensortyp ('temperature', 'humidity' oder 'co2')
     * @return Die Schwellenwerte für den angegebenen Sensortyp
     * @throws IllegalArgumentException Wenn der Sensortyp ungültig ist
     */
    public ThresholdConfig.SensorThreshold getThresholdsForType(String sensorType) {
        try {
            return thresholdConfig.getThresholdBySensorType(sensorType);
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.WARNING, "Versuch, Schwellenwerte für ungültigen Sensortyp abzurufen: " + sensorType, e);
            throw e;
        }
    }

    /**
     * Aktualisiert die Schwellenwerte für einen bestimmten Sensortyp.
     * 
     * @param sensorType Der Sensortyp ('temperature', 'humidity' oder 'co2')
     * @param threshold Die neuen Schwellenwerte
     * @throws IllegalArgumentException Wenn der Sensortyp ungültig ist
     */
    public void updateThresholds(String sensorType, ThresholdConfig.SensorThreshold threshold) {
        try {
            thresholdConfig.updateThresholdBySensorType(sensorType, threshold);
            LOGGER.log(Level.INFO, "Schwellenwerte für " + sensorType + " erfolgreich aktualisiert");
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.WARNING, "Versuch, Schwellenwerte für ungültigen Sensortyp zu aktualisieren: " + sensorType, e);
            throw e;
        }
    }
}
