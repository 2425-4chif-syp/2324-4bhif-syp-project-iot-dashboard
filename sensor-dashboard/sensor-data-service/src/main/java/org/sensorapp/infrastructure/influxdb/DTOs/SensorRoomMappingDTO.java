package org.sensorapp.infrastructure.influxdb.DTOs;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Data Transfer Object für Sensor-zu-Raum Zuordnungen
 */
public class SensorRoomMappingDTO {
    
    @JsonProperty("sensorId")
    private String sensorId;
    
    @JsonProperty("floor")
    private String floor;
    
    @JsonProperty("roomId")
    private Integer roomId;
    
    @JsonProperty("timestamp")
    private String timestamp;

    // Default Konstruktor
    public SensorRoomMappingDTO() {
    }

    // Konstruktor für neue Mappings
    public SensorRoomMappingDTO(String sensorId, String floor, Integer roomId) {
        this.sensorId = sensorId;
        this.floor = floor;
        this.roomId = roomId;
        this.timestamp = java.time.Instant.now().toString();
    }

    // Konstruktor mit allen Feldern
    public SensorRoomMappingDTO(String sensorId, String floor, Integer roomId, String timestamp) {
        this.sensorId = sensorId;
        this.floor = floor;
        this.roomId = roomId;
        this.timestamp = timestamp;
    }

    // Getter und Setter
    public String getSensorId() {
        return sensorId;
    }

    public void setSensorId(String sensorId) {
        this.sensorId = sensorId;
    }

    public String getFloor() {
        return floor;
    }

    public void setFloor(String floor) {
        this.floor = floor;
    }

    public Integer getRoomId() {
        return roomId;
    }

    public void setRoomId(Integer roomId) {
        this.roomId = roomId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "SensorRoomMappingDTO{" +
                "sensorId='" + sensorId + '\'' +
                ", floor='" + floor + '\'' +
                ", roomId=" + roomId +
                ", timestamp='" + timestamp + '\'' +
                '}';
    }
}
