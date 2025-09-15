import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RoomService } from '../../services/room.service';
import { SensorService } from '../../services/sensor.service';
import { SensorMappingService } from '../../services/sensor-mapping.service';
import { Room } from '../../models/room.interface';
import { SensorRoomMapping } from '../../models/sensor-mapping.interface';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

// Interface für Sensor mit zusätzlichen Eigenschaften für die UI
interface SensorUIItem {
  sensorId: string;
  floor: string;
  mappedRoomName?: string;
  mappedRoomId?: number;
}

@Component({
  selector: 'app-sensor-mapping',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    DragDropModule
  ],
  templateUrl: './sensor-mapping.component.html',
  styleUrls: ['./sensor-mapping.component.scss']
})
export class SensorMappingComponent implements OnInit {
  // Daten für die Benutzeroberfläche
  availableSensors: SensorUIItem[] = [];
  availableRooms: Room[] = [];
  floors: string[] = [];
  selectedFloor: string = 'all';
  
  // Ausgewählte Elemente
  selectedSensor: SensorUIItem | null = null;
  selectedRoom: Room | null = null;

  constructor(
    private dialogRef: MatDialogRef<SensorMappingComponent>,
    private roomService: RoomService,
    private sensorService: SensorService,
    private sensorMappingService: SensorMappingService
  ) {}

  ngOnInit(): void {
    // Räume laden
    this.loadRooms();
    
    // Stockwerke laden
    this.loadFloors();
  }

  // Lädt alle verfügbaren Räume
  loadRooms(): void {
    this.roomService.getAllRooms().subscribe(rooms => {
      this.availableRooms = rooms;
    });
  }

  // Lädt alle verfügbaren Stockwerke
  loadFloors(): void {
    this.sensorService.getAllFloors().subscribe(floors => {
      this.floors = floors;
      this.loadSensors();
    });
  }

  // Lädt Sensoren basierend auf dem ausgewählten Stockwerk
  loadSensors(): void {
    this.availableSensors = [];
    
    // Wenn alle Stockwerke ausgewählt sind
    if (this.selectedFloor === 'all') {
      this.floors.forEach(floor => this.loadSensorsForFloor(floor));
    } else {
      // Nur für das ausgewählte Stockwerk laden
      this.loadSensorsForFloor(this.selectedFloor);
    }
  }

  // Lädt Sensoren für ein bestimmtes Stockwerk
  loadSensorsForFloor(floor: string): void {
    this.sensorService.getSensorsByFloor(floor).subscribe(sensors => {
      // Für jeden Sensor prüfen, ob er bereits einem Raum zugeordnet ist
      sensors.forEach(sensorId => {
        const roomId = this.sensorMappingService.findRoomForSensor(sensorId, floor);
        
        let mappedRoomName: string | undefined;
        if (roomId) {
          const room = this.availableRooms.find(r => r.roomId === roomId);
          mappedRoomName = room?.roomName;
        }
        
        this.availableSensors.push({
          sensorId: sensorId,
          floor: floor,
          mappedRoomId: roomId || undefined,
          mappedRoomName: mappedRoomName
        });
      });
    });
  }

  // Markiert einen Sensor als ausgewählt
  selectSensor(sensor: SensorUIItem): void {
    this.selectedSensor = sensor;
    
    // Wenn der Sensor bereits einem Raum zugeordnet ist, diesen Raum auswählen
    if (sensor.mappedRoomId) {
      this.selectedRoom = this.availableRooms.find(r => r.roomId === sensor.mappedRoomId) || null;
    } else {
      this.selectedRoom = null;
    }
  }

  // Markiert einen Raum als ausgewählt
  selectRoom(room: Room): void {
    if (this.selectedSensor) {
      this.selectedRoom = room;
    }
  }

  // Speichert die Zuordnung von Sensor zu Raum
  saveSensorRoomMapping(): void {
    if (this.selectedSensor && this.selectedRoom) {
      const mapping: SensorRoomMapping = {
        sensorId: this.selectedSensor.sensorId,
        floor: this.selectedSensor.floor,
        roomId: this.selectedRoom.roomId
      };
      
      this.sensorMappingService.addOrUpdateMapping(mapping).subscribe({
        next: () => {
          console.log('Sensor-Mapping erfolgreich gespeichert');
          // Aktualisiert die UI-Anzeige
          this.selectedSensor!.mappedRoomId = this.selectedRoom!.roomId;
          this.selectedSensor!.mappedRoomName = this.selectedRoom!.roomName;
        },
        error: (error) => {
          console.error('Fehler beim Speichern des Sensor-Mappings:', error);
          // Bei Fehlern trotzdem die lokale UI aktualisieren (Fallback)
          this.selectedSensor!.mappedRoomId = this.selectedRoom!.roomId;
          this.selectedSensor!.mappedRoomName = this.selectedRoom!.roomName;
        }
      });
    }
  }

  // Entfernt die Zuordnung für den ausgewählten Sensor
  removeMappingForSelectedSensor(): void {
    if (this.selectedSensor) {
      this.sensorMappingService.removeMapping(
        this.selectedSensor.sensorId, 
        this.selectedSensor.floor
      ).subscribe({
        next: () => {
          console.log('Sensor-Mapping erfolgreich entfernt');
          // Aktualisiert die UI-Anzeige
          this.selectedSensor!.mappedRoomId = undefined;
          this.selectedSensor!.mappedRoomName = undefined;
          this.selectedRoom = null;
        },
        error: (error) => {
          console.error('Fehler beim Entfernen des Sensor-Mappings:', error);
          // Bei Fehlern trotzdem die lokale UI aktualisieren (Fallback)
          this.selectedSensor!.mappedRoomId = undefined;
          this.selectedSensor!.mappedRoomName = undefined;
          this.selectedRoom = null;
        }
      });
    }
  }

  // Schließt den Dialog
  closeDialog(): void {
    this.dialogRef.close();
  }

  // Drag and Drop Functionality
  onSensorDrop(event: CdkDragDrop<Room>): void {
    const sensorElement = event.item.element.nativeElement;
    const sensorId = sensorElement.getAttribute('data-sensor-id');
    const floor = sensorElement.getAttribute('data-floor');
    
    if (sensorId && floor) {
      // Find the sensor object
      const sensor = this.availableSensors.find(s => 
        s.sensorId === sensorId && s.floor === floor
      );
      
      // Find the target room
      const room = event.container.data;
      
      if (sensor && room) {
        // Set the selected sensor and room (to maintain compatibility with existing code)
        this.selectedSensor = sensor;
        this.selectedRoom = room;
        
        // Save the mapping
        this.saveSensorRoomMapping();
      }
    }
  }
}