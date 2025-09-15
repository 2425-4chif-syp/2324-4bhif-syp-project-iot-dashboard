export interface SensorValue {
    timestamp: string;
    value: number;
}

export interface SensorData {
    timestamp: string;
    sensorType: string;
    value: number;
}

export interface RoomSensor {
    sensorId: string;
    sensorTypes: string[];
    latestValues: { [key: string]: SensorValue };
}