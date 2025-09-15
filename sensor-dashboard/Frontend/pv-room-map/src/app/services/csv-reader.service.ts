import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as Papa from 'papaparse';

export interface Room {
  RoomId: string;
  RoomLabel: string;
  RoomName: string;
  RoomType: string;
  North: string;
  South: string;
  West: string;
  East: string;
  'Gang-Connection': string;
  'Gang-Position': string;
}

@Injectable({
  providedIn: 'root'
})
export class CsvReaderService {
  constructor(private http: HttpClient) {}

  readCsv(filePath: string): Observable<Room[]> {
    return this.http.get(filePath, { responseType: 'text' }).pipe(
      map((csvData) => {
        const result = Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          delimiter: ',',
          transformHeader: (header: string) => {
            // Remove any BOM characters and trim whitespace
            return header.replace(/^\uFEFF/, '').trim();
          }
        });
        console.log('Parsed CSV result:', result);
        return result.data as Room[];
      })
    );
  }
}
