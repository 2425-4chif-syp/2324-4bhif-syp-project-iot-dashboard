import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { SensorMapping, SensorRoomMapping } from '../models/sensor-mapping.interface';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SensorMappingService {
  
  // API Base URL für die Backend-Kommunikation
  private readonly API_BASE_URL = '/api/sensors/mappings';
  
  // Der lokale Speicher-Key für die Mappings (als Fallback)
  private readonly STORAGE_KEY = 'sensor-room-mappings';
  
  // BehaviorSubject, um Änderungen an Mappings zu überwachen
  private mappingsSubject = new BehaviorSubject<SensorRoomMapping[]>([]);

  constructor(private http: HttpClient) {
    // Beim Start Mappings vom Backend laden
    this.loadMappingsFromBackend();
  }

  // Lädt die Mappings vom Backend
  private loadMappingsFromBackend(): void {
    this.http.get<SensorRoomMapping[]>(this.API_BASE_URL)
      .pipe(
        tap(mappings => {
          console.log('Mappings vom Backend geladen:', mappings);
          this.mappingsSubject.next(mappings);
        }),
        catchError(err => {
          console.error('Fehler beim Laden der Mappings vom Backend:', err);
          // Fallback: Versuche aus localStorage zu laden
          const localMappings = this.loadMappingsFromStorage();
          this.mappingsSubject.next(localMappings);
          return of([]);
        })
      ).subscribe();
  }

  // Lädt die Mappings aus dem lokalen Speicher (Fallback)
  private loadMappingsFromStorage(): SensorRoomMapping[] {
    const mappingsJson = localStorage.getItem(this.STORAGE_KEY);
    if (mappingsJson) {
      try {
        return JSON.parse(mappingsJson);
      } catch (error) {
        console.error('Fehler beim Laden der Sensor-Mappings aus localStorage:', error);
        return [];
      }
    }
    return [];
  }

  // Speichert Mappings im lokalen Speicher (Fallback)
  private saveMappingsToStorage(mappings: SensorRoomMapping[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappings));
  }

  // Gibt alle Mappings als Observable zurück
  getMappings(): Observable<SensorRoomMapping[]> {
    return this.mappingsSubject.asObservable();
  }

  // Lädt die Mappings erneut vom Backend
  refreshMappings(): void {
    this.loadMappingsFromBackend();
  }

  // Fügt ein neues Mapping hinzu oder aktualisiert ein bestehendes
  addOrUpdateMapping(mapping: SensorRoomMapping): Observable<void> {
    return this.http.post<void>(this.API_BASE_URL, mapping)
      .pipe(
        tap(() => {
          console.log('Mapping erfolgreich gespeichert:', mapping);
          // Nach erfolgreichem Speichern die lokale Liste aktualisieren
          this.updateLocalMapping(mapping);
          // Auch als Fallback im localStorage speichern
          this.saveMappingsToStorage(this.mappingsSubject.value);
        }),
        catchError(err => {
          console.error('Fehler beim Speichern des Mappings:', err);
          // Fallback: Nur lokal speichern
          this.updateLocalMapping(mapping);
          this.saveMappingsToStorage(this.mappingsSubject.value);
          throw err;
        })
      );
  }

  // Aktualisiert das Mapping in der lokalen Liste
  private updateLocalMapping(mapping: SensorRoomMapping): void {
    const mappings = this.mappingsSubject.value;
    
    // Prüfen, ob ein Mapping für diesen Sensor bereits existiert
    const existingIndex = mappings.findIndex(m => 
      m.sensorId === mapping.sensorId && m.floor === mapping.floor
    );
    
    if (existingIndex >= 0) {
      // Bestehendes Mapping aktualisieren
      mappings[existingIndex] = mapping;
    } else {
      // Neues Mapping hinzufügen
      mappings.push(mapping);
    }
    
    this.mappingsSubject.next([...mappings]);
  }

  // Entfernt ein Mapping
  removeMapping(sensorId: string, floor: string): Observable<void> {
    const url = `${this.API_BASE_URL}/${encodeURIComponent(floor)}/${encodeURIComponent(sensorId)}`;
    
    return this.http.delete<void>(url)
      .pipe(
        tap(() => {
          console.log('Mapping erfolgreich entfernt:', { sensorId, floor });
          // Nach erfolgreichem Löschen die lokale Liste aktualisieren
          this.removeLocalMapping(sensorId, floor);
          // Auch als Fallback im localStorage speichern
          this.saveMappingsToStorage(this.mappingsSubject.value);
        }),
        catchError(err => {
          console.error('Fehler beim Entfernen des Mappings:', err);
          // Fallback: Nur lokal entfernen
          this.removeLocalMapping(sensorId, floor);
          this.saveMappingsToStorage(this.mappingsSubject.value);
          throw err;
        })
      );
  }

  // Entfernt das Mapping aus der lokalen Liste
  private removeLocalMapping(sensorId: string, floor: string): void {
    let mappings = this.mappingsSubject.value;
    mappings = mappings.filter(m => !(m.sensorId === sensorId && m.floor === floor));
    this.mappingsSubject.next([...mappings]);
  }

  // Findet ein Raumzuordnung für einen Sensor
  findRoomForSensor(sensorId: string, floor: string): number | null {
    const mapping = this.mappingsSubject.value.find(
      m => m.sensorId === sensorId && m.floor === floor
    );
    
    return mapping ? mapping.roomId : null;
  }

  // Findet alle Sensoren für einen Raum
  findSensorsForRoom(roomId: number): SensorRoomMapping[] {
    return this.mappingsSubject.value.filter(m => m.roomId === roomId);
  }
}