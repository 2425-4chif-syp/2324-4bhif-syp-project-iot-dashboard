package org.sensorapp.infrastructure.config;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Konfigurationsklasse für Schwellenwerte der Sensoren.
 * Enthält die Schwellenwerte für verschiedene Sensortypen (Temperatur, Luftfeuchtigkeit, CO2).
 */
@ApplicationScoped
public class ThresholdConfig {

    /**
     * Innere Klasse zur Darstellung von Schwellenwerten für einen Sensortyp.
     */
    public static class SensorThreshold {
        private double warningLow;
        private double warningHigh;
        private double dangerLow;
        private double dangerHigh;

        public SensorThreshold() {
            // Default-Konstruktor für JSON-Deserialisierung
        }

        public SensorThreshold(double warningLow, double warningHigh, double dangerLow, double dangerHigh) {
            this.warningLow = warningLow;
            this.warningHigh = warningHigh;
            this.dangerLow = dangerLow;
            this.dangerHigh = dangerHigh;
        }

        public double getWarningLow() {
            return warningLow;
        }

        public void setWarningLow(double warningLow) {
            this.warningLow = warningLow;
        }

        public double getWarningHigh() {
            return warningHigh;
        }

        public void setWarningHigh(double warningHigh) {
            this.warningHigh = warningHigh;
        }

        public double getDangerLow() {
            return dangerLow;
        }

        public void setDangerLow(double dangerLow) {
            this.dangerLow = dangerLow;
        }

        public double getDangerHigh() {
            return dangerHigh;
        }

        public void setDangerHigh(double dangerHigh) {
            this.dangerHigh = dangerHigh;
        }
    }

    // Schwellenwerte für verschiedene Sensortypen
    private SensorThreshold temperature;
    private SensorThreshold humidity;
    private SensorThreshold co2;

    public ThresholdConfig() {
        // Standardwerte initialisieren
        this.temperature = new SensorThreshold(15, 25, 10, 30);
        this.humidity = new SensorThreshold(30, 60, 20, 70);
        this.co2 = new SensorThreshold(600, 1000, 0, 1200);
    }

    public SensorThreshold getTemperature() {
        return temperature;
    }

    public void setTemperature(SensorThreshold temperature) {
        this.temperature = temperature;
    }

    public SensorThreshold getHumidity() {
        return humidity;
    }

    public void setHumidity(SensorThreshold humidity) {
        this.humidity = humidity;
    }

    public SensorThreshold getCo2() {
        return co2;
    }

    public void setCo2(SensorThreshold co2) {
        this.co2 = co2;
    }

    /**
     * Gibt die Schwellenwerte für einen bestimmten Sensortyp zurück.
     * 
     * @param sensorType Der Sensortyp ('temperature', 'humidity' oder 'co2')
     * @return Die Schwellenwerte für den angegebenen Sensortyp
     * @throws IllegalArgumentException Wenn der Sensortyp ungültig ist
     */
    public SensorThreshold getThresholdBySensorType(String sensorType) {
        sensorType = sensorType.toLowerCase();
        switch (sensorType) {
            case "temperature":
                return this.temperature;
            case "humidity":
                return this.humidity;
            case "co2":
                return this.co2;
            default:
                throw new IllegalArgumentException("Unbekannter Sensortyp: " + sensorType);
        }
    }

    /**
     * Aktualisiert die Schwellenwerte für einen bestimmten Sensortyp.
     * 
     * @param sensorType Der Sensortyp ('temperature', 'humidity' oder 'co2')
     * @param threshold Die neuen Schwellenwerte
     * @throws IllegalArgumentException Wenn der Sensortyp ungültig ist
     */
    public void updateThresholdBySensorType(String sensorType, SensorThreshold threshold) {
        sensorType = sensorType.toLowerCase();
        switch (sensorType) {
            case "temperature":
                this.temperature = threshold;
                break;
            case "humidity":
                this.humidity = threshold;
                break;
            case "co2":
                this.co2 = threshold;
                break;
            default:
                throw new IllegalArgumentException("Unbekannter Sensortyp: " + sensorType);
        }
    }
}
