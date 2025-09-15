import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvReaderService } from '../../services/csv-reader.service';

interface Room {
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

interface Position {
  x: number;
  y: number;
}

interface CorridorSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  showLabel?: boolean;
}

interface Corridor {
  id: string;
  rooms: Room[];
  segments: CorridorSegment[];
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MapComponent implements OnInit {
  rooms: Room[] = [];
  roomPositions: Map<string, Position> = new Map();
  corridors: Map<string, Corridor> = new Map();
  roomSize = 90;
  corridorWidth = 30;
  spacing = 30;
  baseX = 300;
  baseY = 200;

  constructor(private csvReader: CsvReaderService) {}

  ngOnInit(): void {
    console.log('Loading CSV file...');
    this.csvReader.readCsv('assets/Imaginary_Room_Structure.csv').subscribe({
      next: (data: any[]) => {
        console.log('CSV data loaded:', data);
        this.rooms = data.map(row => ({
          RoomId: row.RoomId?.toString().padStart(4, '0') || '',
          RoomLabel: row.RoomLabel || '',
          RoomName: row.RoomName || '',
          RoomType: row.RoomType || '',
          North: row.North?.toString().padStart(4, '0') || '',
          South: row.South?.toString().padStart(4, '0') || '',
          West: row.West?.toString().padStart(4, '0') || '',
          East: row.East?.toString().padStart(4, '0') || '',
          'Gang-Connection': row['Gang-Connection'] || '',
          'Gang-Position': row['Gang-Position'] || ''
        })).filter(room => room.RoomId && room.RoomId.trim() !== '');
        
        console.log('Processed rooms:', this.rooms);
        this.calculateRoomPositions();
        this.createCorridors();
      },
      error: (error) => {
        console.error('Error loading CSV:', error);
      }
    });
  }

  private calculateRoomPositions(): void {
    // Starte mit R01 (erste Raum)
    const startRoom = this.rooms.find(r => r.RoomId === '0001')!;
    const queue: Array<{room: Room, direction: string, parent: string}> = [
      {room: startRoom, direction: 'center', parent: ''}
    ];
    
    // Berechne die Startposition in der Mitte des Bildschirms
    // Wir setzen den Startpunkt etwas nach links und oben, da sich das Layout nach rechts und unten entwickelt
    this.roomPositions.set(startRoom.RoomId, {
      x: window.innerWidth / 2 - this.roomSize * 3,
      y: window.innerHeight / 2 - this.roomSize * 4
    });
    
    // Set für bereits platzierte Räume
    const placedRooms = new Set<string>([startRoom.RoomId]);
    
    // Map für die Richtung jedes Raums relativ zu seinem Elternraum
    const roomDirections = new Map<string, string>();
    roomDirections.set(startRoom.RoomId, 'center');

    while (queue.length > 0) {
      const {room, direction, parent} = queue.shift()!;
      const currentPos = this.roomPositions.get(room.RoomId)!;

      // Finde alle verbundenen Räume
      const connections = this.getConnectedRooms(room);
      
      for (const connection of connections) {
        if (placedRooms.has(connection.room.RoomId)) continue;

        // Bestimme die Position des verbundenen Raums
        const newPos = this.calculateNewPosition(currentPos, connection.direction, roomDirections.get(room.RoomId) || 'center');
        this.roomPositions.set(connection.room.RoomId, newPos);
        placedRooms.add(connection.room.RoomId);
        roomDirections.set(connection.room.RoomId, connection.direction);

        // Füge verbundenen Raum zur Queue hinzu
        queue.push({
          room: connection.room,
          direction: connection.direction,
          parent: room.RoomId
        });
      }
    }

    // Nachdem alle Räume platziert sind, berechne die tatsächlichen Grenzen
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.roomPositions.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + this.roomSize);
      maxY = Math.max(maxY, pos.y + this.roomSize);
    });

    // Berechne den Offset, um das Layout zu zentrieren
    const offsetX = (window.innerWidth - (maxX - minX)) / 2 - minX;
    const offsetY = (window.innerHeight - (maxY - minY)) / 2 - minY;

    // Wende den Offset auf alle Räume an
    this.roomPositions.forEach((pos, roomId) => {
      this.roomPositions.set(roomId, {
        x: pos.x + offsetX,
        y: pos.y + offsetY
      });
    });
  }

  private getConnectedRooms(room: Room): Array<{room: Room, direction: string}> {
    const connections: Array<{room: Room, direction: string}> = [];
    
    // Prüfe North-Verbindung
    if (room.North) {
      const connectedRoom = this.rooms.find(r => r.RoomId === room.North);
      if (connectedRoom) {
        connections.push({room: connectedRoom, direction: 'north'});
      }
    }
    
    // Prüfe South-Verbindung
    if (room.South) {
      const connectedRoom = this.rooms.find(r => r.RoomId === room.South);
      if (connectedRoom) {
        connections.push({room: connectedRoom, direction: 'south'});
      }
    }
    
    // Prüfe East-Verbindung
    if (room.East) {
      const connectedRoom = this.rooms.find(r => r.RoomId === room.East);
      if (connectedRoom) {
        connections.push({room: connectedRoom, direction: 'east'});
      }
    }
    
    // Prüfe West-Verbindung
    if (room.West) {
      const connectedRoom = this.rooms.find(r => r.RoomId === room.West);
      if (connectedRoom) {
        connections.push({room: connectedRoom, direction: 'west'});
      }
    }
    
    return connections;
  }

  private calculateNewPosition(currentPos: Position, direction: string, parentDirection: string): Position {
    // Basis-Offset für jede Richtung
    const offset = this.roomSize + this.spacing;
    
    switch (direction) {
      case 'north':
        return {
          x: currentPos.x,
          y: currentPos.y - offset
        };
      case 'south':
        return {
          x: currentPos.x,
          y: currentPos.y + offset
        };
      case 'east':
        return {
          x: currentPos.x + offset,
          y: currentPos.y
        };
      case 'west':
        return {
          x: currentPos.x - offset,
          y: currentPos.y
        };
      default:
        return currentPos;
    }
  }

  private sortRoomsByConnections(rooms: Room[]): Room[] {
    const sorted: Room[] = [];
    const visited = new Set<string>();
    
    // Finde den Startpunkt (Raum ohne North-Verbindung)
    const start = rooms.find(r => !r.North) || rooms[0];
    
    // Rekursive Funktion zum Verfolgen der Verbindungen
    const visit = (room: Room) => {
      if (!room || visited.has(room.RoomId)) return;
      
      visited.add(room.RoomId);
      sorted.push(room);
      
      // Finde den nächsten verbundenen Raum (South oder East)
      let nextRoom = rooms.find(r => r.RoomId === room.South);
      if (!nextRoom) {
        nextRoom = rooms.find(r => r.RoomId === room.East);
      }
      if (nextRoom) visit(nextRoom);
      
      // Wenn kein direkter Nachfolger gefunden wurde, suche nach Räumen, die diesen als North oder West haben
      if (!nextRoom) {
        nextRoom = rooms.find(r => r.North === room.RoomId || r.West === room.RoomId);
        if (nextRoom) visit(nextRoom);
      }
    };
    
    visit(start);

    // Füge alle übrigen Räume hinzu (falls welche nicht verbunden sind)
    rooms.forEach(room => {
      if (!visited.has(room.RoomId)) {
        sorted.push(room);
      }
    });

    return sorted;
  }

  private createCorridors(): void {
    this.corridors.clear();
    
    // Erstelle Gänge für jede Gang-ID
    const gangIds = new Set(this.rooms.map(r => r['Gang-Connection']));
    
    gangIds.forEach(gangId => {
      if (!gangId) return;
      
      const gangRooms = this.rooms.filter(r => r['Gang-Connection'] === gangId);
      const segments: CorridorSegment[] = [];
      
      // Sortiere Räume nach Position
      const sortedRooms = this.sortRoomsByConnections(gangRooms);
      
      // Erstelle Gangsegmente zwischen den Räumen
      for (let i = 0; i < sortedRooms.length - 1; i++) {
        const currentRoom = sortedRooms[i];
        const nextRoom = sortedRooms[i + 1];
        const currentPos = this.roomPositions.get(currentRoom.RoomId)!;
        const nextPos = this.roomPositions.get(nextRoom.RoomId)!;

        // Bestimme die Verbindungsrichtung
        if (nextRoom.RoomId === currentRoom.South) {
          // Vertikaler Gang nach unten
          segments.push({
            x: currentPos.x + this.roomSize,  // Rechte Kante des Raums
            y: currentPos.y,  // Beginnt an der oberen Kante
            width: this.corridorWidth,
            height: nextPos.y + this.roomSize - currentPos.y, // Geht bis zur unteren Kante des nächsten Raums
            showLabel: i === 0
          });
        } else if (nextRoom.RoomId === currentRoom.East) {
          // Horizontaler Gang nach rechts
          segments.push({
            x: currentPos.x + this.roomSize,  // Beginnt an der rechten Kante
            y: currentPos.y + this.roomSize,  // Untere Kante
            width: nextPos.x - currentPos.x,  // Geht bis zur linken Kante des nächsten Raums
            height: this.corridorWidth,
            showLabel: i === 0
          });
        }

        // Wenn es einen Richtungswechsel gibt (z.B. von vertikal nach horizontal)
        if (this.isDirectionChange(currentRoom, nextRoom)) {
          // Vertikales Segment
          segments.push({
            x: currentPos.x + this.roomSize,
            y: Math.min(currentPos.y, nextPos.y),
            width: this.corridorWidth,
            height: Math.abs(nextPos.y - currentPos.y) + this.roomSize,
            showLabel: false
          });

          // Horizontales Segment
          segments.push({
            x: Math.min(currentPos.x, nextPos.x) + this.roomSize,
            y: nextPos.y + this.roomSize,
            width: Math.abs(nextPos.x - currentPos.x),
            height: this.corridorWidth,
            showLabel: false
          });
        }

        // Zusätzliche Verbindungen für Räume mit mehreren Nachbarn
        const otherConnections = this.getAdditionalConnections(currentRoom, gangRooms);
        otherConnections.forEach(connection => {
          const connectedPos = this.roomPositions.get(connection.roomId)!;
          
          if (connection.direction === 'vertical') {
            segments.push({
              x: currentPos.x + this.roomSize,
              y: Math.min(currentPos.y, connectedPos.y),
              width: this.corridorWidth,
              height: Math.abs(connectedPos.y - currentPos.y) + this.roomSize,
              showLabel: false
            });
          } else {
            segments.push({
              x: Math.min(currentPos.x, connectedPos.x) + this.roomSize,
              y: currentPos.y + this.roomSize,
              width: Math.abs(connectedPos.x - currentPos.x),
              height: this.corridorWidth,
              showLabel: false
            });
          }
        });
      }

      // Füge das letzte Segment für den letzten Raum hinzu
      const lastRoom = sortedRooms[sortedRooms.length - 1];
      const lastPos = this.roomPositions.get(lastRoom.RoomId)!;
      
      // Füge ein kleines Segment am Ende hinzu
      segments.push({
        x: lastPos.x + this.corridorWidth,  // Etwas links vom vertikalen Segment
        y: lastPos.y + this.roomSize,  // Auf Höhe des vertikalen Segments
        width: this.roomSize - this.corridorWidth,  // Bis zum vertikalen Segment
        height: this.corridorWidth,
        showLabel: false
      });

      this.corridors.set(gangId, {
        id: gangId,
        rooms: gangRooms,
        segments
      });
    });
  }

  private getAdditionalConnections(room: Room, gangRooms: Room[]): Array<{roomId: string, direction: 'vertical' | 'horizontal'}> {
    const connections: Array<{roomId: string, direction: 'vertical' | 'horizontal'}> = [];
    
    // Prüfe alle möglichen Verbindungen
    if (room.North && gangRooms.some(r => r.RoomId === room.North)) {
      connections.push({roomId: room.North, direction: 'vertical'});
    }
    if (room.South && gangRooms.some(r => r.RoomId === room.South)) {
      connections.push({roomId: room.South, direction: 'vertical'});
    }
    if (room.East && gangRooms.some(r => r.RoomId === room.East)) {
      connections.push({roomId: room.East, direction: 'horizontal'});
    }
    if (room.West && gangRooms.some(r => r.RoomId === room.West)) {
      connections.push({roomId: room.West, direction: 'horizontal'});
    }
    
    return connections;
  }

  private isDirectionChange(currentRoom: Room, nextRoom: Room): boolean {
    // Prüft, ob es einen Richtungswechsel zwischen zwei Räumen gibt
    const isVertical = nextRoom.RoomId === currentRoom.North || nextRoom.RoomId === currentRoom.South;
    const isHorizontal = nextRoom.RoomId === currentRoom.East || nextRoom.RoomId === currentRoom.West;
    return !isVertical && !isHorizontal;
  }

  private createCornerSegment(currentPos: Position, nextPos: Position, currentRoom: Room, nextRoom: Room): CorridorSegment | null {
    // Erstellt ein Ecksegment für den Gang
    const cornerX = Math.min(currentPos.x, nextPos.x) + this.roomSize;
    const cornerY = Math.min(currentPos.y, nextPos.y) + this.roomSize;

    return {
      x: cornerX,
      y: cornerY,
      width: this.corridorWidth,
      height: this.corridorWidth,
      showLabel: false
    };
  }

  getMapStyle(): any {
    return {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'auto'
    };
  }

  getRoomStyle(room: Room): any {
    const position = this.roomPositions.get(room.RoomId);
    if (!position) {
      console.warn(`No position found for room ${room.RoomId}`);
      return {};
    }

    return {
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${this.roomSize}px`,
      height: `${this.roomSize}px`,
      backgroundColor: this.getRoomColor(room.RoomType),
      border: '2px solid #666',
      borderRadius: '8px',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      zIndex: 1
    };
  }

  getCorridorSegmentStyle(segment: CorridorSegment): any {
    return {
      position: 'absolute',
      left: `${segment.x}px`,
      top: `${segment.y}px`,
      width: `${segment.width}px`,
      height: `${segment.height}px`,
      backgroundColor: '#f0f0f0',
      border: '2px solid #999',
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '12px',
      color: '#666'
    };
  }

  private getRoomColor(roomType: string): string {
    const colors: { [key: string]: string } = {
      'Büro': '#A8D5E5',
      'Besprechungsraum': '#95B8D1',
      'Halle': '#E8DDB5',
      'Lager': '#D1C089',
      'Technikraum': '#B8C0E4',
      'Aufenthaltsraum': '#FFB6B6',
      'Küche': '#FFDAB9',
      'Archiv': '#DEB887',
      'Labor': '#B8E6B8',
      'Werkstatt': '#D3D3D3',
      'Bibliothek': '#DDA0DD',
      'Leseraum': '#E6E6FA',
      'Seminarraum': '#98FB98',
      'Fitnessraum': '#87CEEB',
      'Umkleideraum': '#F0E68C',
      'Sanitärraum': '#E6E6FA'
    };
    return colors[roomType] || '#ffffff';
  }
}
