import { RoomSensor } from './sensor.interface';

export interface Room {
    roomId: number;
    roomLabel: string;
    roomName: string;
    roomType: string;
    corridorId: number | null;
    neighbourInsideId: number | null;
    neighbourOutsideId: number | null;
    direction: string;
    sensor?: RoomSensor;
}