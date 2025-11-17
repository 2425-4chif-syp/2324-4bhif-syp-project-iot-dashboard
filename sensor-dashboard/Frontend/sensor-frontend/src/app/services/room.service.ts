import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Room } from '../models/room.interface';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private apiUrl = 'sd/api/room';

  constructor(private http: HttpClient) { }

  getAllRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/all`);
  }

  getRoomById(id: number): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/${id}`);
  }
}
