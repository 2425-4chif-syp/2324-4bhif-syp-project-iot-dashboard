package org.sensorapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Table(name = "room")
public class Room {

    @Id
    @Column(name = "RoomId")
    int roomId;

    @Column(name = "RoomLabel", nullable = true)
    String roomLabel;

    @Column(name = "RoomName")
    String RoomName;

    @Column(name = "RoomType")
    String roomType;

    @ManyToOne
    @JoinColumn(name = "Corridor", referencedColumnName = "RoomId", nullable = true)
    private Room corridor; // Der Korridor dieses Raums

    @ManyToOne
    @JoinColumn(name = "NeighbourInside", referencedColumnName = "RoomId", nullable = true)
    private Room neighbourInside; // Raum, der sich auf der Innenseite befindet

    @ManyToOne
    @JoinColumn(name = "NeighbourOutside", referencedColumnName = "RoomId", nullable = true)
    private Room neighbourOutside; // Raum, der sich auf der Außenseite befindet

    @Column(name = "Direction", nullable = true)
    String direction;

    public int getRoomId() {
        return roomId;
    }

    public String getRoomLabel() {
        return roomLabel;
    }

    public String getRoomName() {
        return RoomName;
    }

    public String getRoomType() {
        return roomType;
    }

    public String getDirection() {
        return direction;
    }

    public Room getCorridor() {
        return corridor;
    }

    public Room getNeighbourInside() {
        return neighbourInside;
    }

    public Room getNeighbourOutside() {
        return neighbourOutside;
    }

}
