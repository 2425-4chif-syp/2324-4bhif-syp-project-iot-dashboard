import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SensorData, SensorValue } from '../models/sensor.interface';

@Injectable({
  providedIn: 'root'
})
export class SensorService {
  private realApiUrl = '/sd/api/sensors';
  private testApiUrl = '/sd/api/sensors';
  
  // Flag to determine whether to use both real and test sensors
  private useTestSensors = true;

  constructor(private http: HttpClient) { }

  // Method to get data from both real and test APIs
  private getFromBothSources<T>(path: string): Observable<T[]> {
    const realSource = this.http.get<T[]>(`${this.realApiUrl}${path}`).pipe(
      catchError(error => {
        console.warn(`Error fetching from real sensor API: ${error.message}`);
        return of([]);
      })
    );
    
    if (this.useTestSensors) {
      const testSource = this.http.get<T[]>(`${this.testApiUrl}${path}`).pipe(
        catchError(error => {
          console.warn(`Error fetching from test sensor API: ${error.message}`);
          return of([]);
        })
      );
      
      // Combine results from both sources
      return forkJoin([realSource, testSource]).pipe(
        map(([realData, testData]) => {
          // Filter out duplicates if needed
          const combined = [...realData, ...testData];
          return Array.from(new Set(combined));
        }),
        catchError(error => {
          console.error('Error combining sensor data:', error);
          return of([]);
        })
      );
    } else {
      return realSource;
    }
  }

  // Get all floors
  getAllFloors(): Observable<string[]> {
    return this.getFromBothSources<string>('/floors');
  }

  // Get sensors for a specific floor
  getSensorsByFloor(floor: string): Observable<string[]> {
    return this.getFromBothSources<string>(`/${floor}`);
  }

  // Get sensor fields
  getSensorFields(floor: string, sensorId: string): Observable<string[]> {
    // Check if it's a test sensor
    if (sensorId.startsWith('test_sensor_')) {
      return this.http.get<string[]>(`${this.testApiUrl}/${floor}/${sensorId}`).pipe(
        catchError(error => {
          console.error(`Error fetching test sensor fields: ${error.message}`);
          return of([]);
        })
      );
    } else {
      return this.http.get<string[]>(`${this.realApiUrl}/${floor}/${sensorId}`).pipe(
        catchError(error => {
          console.error(`Error fetching real sensor fields: ${error.message}`);
          return of([]);
        })
      );
    }
  }

  // Get values for a specific sensor type
  getSpecificSensorValues(floor: string, sensorId: string, sensorType: string): Observable<SensorValue[]> {
    // Check if it's a test sensor
    if (sensorId.startsWith('test_sensor_')) {
      return this.http.get<SensorValue[]>(`${this.testApiUrl}/${floor}/${sensorId}/${sensorType}`).pipe(
        catchError(error => {
          console.error(`Error fetching test sensor values: ${error.message}`);
          return of([]);
        })
      );
    } else {
      return this.http.get<SensorValue[]>(`${this.realApiUrl}/${floor}/${sensorId}/${sensorType}`).pipe(
        catchError(error => {
          console.error(`Error fetching real sensor values: ${error.message}`);
          return of([]);
        })
      );
    }
  }

  // Get all values for a sensor
  getAllSensorValues(floor: string, sensorId: string): Observable<SensorData[]> {
    // Check if it's a test sensor
    if (sensorId.startsWith('test_sensor_')) {
      return this.http.get<SensorData[]>(`${this.testApiUrl}/${floor}/${sensorId}/values`).pipe(
        catchError(error => {
          console.error(`Error fetching test sensor values: ${error.message}`);
          return of([]);
        })
      );
    } else {
      return this.http.get<SensorData[]>(`${this.realApiUrl}/${floor}/${sensorId}/values`).pipe(
        catchError(error => {
          console.error(`Error fetching real sensor values: ${error.message}`);
          return of([]);
        })
      );
    }
  }
}