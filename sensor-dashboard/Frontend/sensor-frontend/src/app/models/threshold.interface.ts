/**
 * Interface für einen einzelnen Schwellenwert-Satz eines Sensortyps.
 * Definiert die Grenzen für optimale, Warn- und Gefahrenbereiche.
 */
export interface SensorThreshold {
  warningLow: number;
  warningHigh: number;
  dangerLow: number;
  dangerHigh: number;
}

/**
 * Interface für die gesamte Schwellenwert-Konfiguration aller Sensortypen.
 */
export interface ThresholdConfig {
  temperature: SensorThreshold;
  humidity: SensorThreshold;
  co2: SensorThreshold;
}
