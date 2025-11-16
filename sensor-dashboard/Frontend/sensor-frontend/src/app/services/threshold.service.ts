import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { SensorThreshold, ThresholdConfig } from '../models/threshold.interface';

@Injectable({
  providedIn: 'root'
})
export class ThresholdService {
  private apiUrl = '/sd/api/thresholds';
  
  // Default-Werte als Fallback, falls das Backend nicht erreichbar ist
  private defaultThresholds: ThresholdConfig = {
    temperature: {
      warningLow: 15,
      warningHigh: 25,
      dangerLow: 10,
      dangerHigh: 30
    },
    humidity: {
      warningLow: 30,
      warningHigh: 60,
      dangerLow: 20,
      dangerHigh: 70
    },
    co2: {
      warningLow: 600,
      warningHigh: 1000,
      dangerLow: 0,
      dangerHigh: 1200
    }
  };

  // BehaviorSubject zur Speicherung und Verteilung der aktuellen Schwellenwerte
  public thresholdConfig = new BehaviorSubject<ThresholdConfig>(this.defaultThresholds);
  
  constructor(private http: HttpClient) { 
    // Beim Start die Schwellenwerte vom Server laden
    this.loadThresholds();
  }

  // Lädt die Schwellenwerte vom Server
  loadThresholds(): void {
    this.http.get<ThresholdConfig>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Fehler beim Laden der Schwellenwerte:', error);
        return of(this.defaultThresholds);
      }),
      tap(thresholds => {
        this.thresholdConfig.next(thresholds);
      })
    ).subscribe();
  }

  // Gibt die aktuellen Schwellenwerte als Observable zurück
  getThresholds(): Observable<ThresholdConfig> {
    return this.thresholdConfig.asObservable();
  }

  // Gibt die aktuellen Schwellenwerte für einen bestimmten Sensortyp zurück
  getThresholdsForType(sensorType: string): Observable<SensorThreshold> {
    return new Observable(observer => {
      this.thresholdConfig.subscribe(config => {
        switch(sensorType.toLowerCase()) {
          case 'temperature':
            observer.next(config.temperature);
            break;
          case 'humidity':
            observer.next(config.humidity);
            break;
          case 'co2':
            observer.next(config.co2);
            break;
          default:
            observer.error(new Error(`Ungültiger Sensortyp: ${sensorType}`));
        }
        observer.complete();
      });
    });
  }

  // Aktualisiert die Schwellenwerte für einen bestimmten Sensortyp
  updateThresholds(sensorType: string, thresholds: SensorThreshold): Observable<any> {
    return this.http.put(`${this.apiUrl}/${sensorType}`, thresholds).pipe(
      catchError(error => {
        console.error(`Fehler beim Aktualisieren der Schwellenwerte für ${sensorType}:`, error);
        return of({ success: false, error });
      }),
      tap(() => {
        // Lokalen Cache aktualisieren
        const currentConfig = this.thresholdConfig.value;
        switch(sensorType.toLowerCase()) {
          case 'temperature':
            currentConfig.temperature = thresholds;
            break;
          case 'humidity':
            currentConfig.humidity = thresholds;
            break;
          case 'co2':
            currentConfig.co2 = thresholds;
            break;
        }
        this.thresholdConfig.next(currentConfig);
      })
    );
  }
}
