package org.sensorapp.infrastructure.postgres.DTOs;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class RoomDTO {
    private int roomId;
    private String roomLabel;
    private String roomName;
    private String roomType;
    private Integer corridorId;
    private Integer neighbourInsideId;
    private Integer neighbourOutsideId;
    private String direction;

    public RoomDTO(int roomId, String roomLabel, String roomName, String roomType,
                   Integer corridorId, Integer neighbourInsideId, Integer neighbourOutsideId, String direction) {
        this.roomId = roomId;
        this.roomLabel = roomLabel;
        this.roomName = roomName;
        this.roomType = roomType;
        this.corridorId = corridorId;
        this.neighbourInsideId = neighbourInsideId;
        this.neighbourOutsideId = neighbourOutsideId;
        this.direction = direction;
    }
}
