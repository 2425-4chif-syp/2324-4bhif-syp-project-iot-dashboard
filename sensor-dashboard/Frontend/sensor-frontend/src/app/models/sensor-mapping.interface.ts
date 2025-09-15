export interface SensorRoomMapping {
  sensorId: string;     // Die ID des Sensors (z.B. "tupper_box_v1")
  floor: string;        // Der Stock des Sensors (z.B. "sensors", "ug", "eg")
  roomId: number;       // Die ID des Raumes, zu dem der Sensor gehört
}

export interface SensorMapping {
  mappings: SensorRoomMapping[];
}