package org.sensorapp.infrastructure.postgres;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.sensorapp.entity.Room;

import java.util.List;

@ApplicationScoped
public class RoomRepository {

    @Inject
    EntityManager em;

    public List<Room> getRooms() {
        TypedQuery<Room> query = em.createQuery("SELECT r FROM Room r", Room.class);
        return query.getResultList();
    }

    public Room getRoom(int id) {
        TypedQuery<Room> query = em.createQuery("SELECT r FROM Room r WHERE r.roomId = :id", Room.class);
        return query.setParameter("id", id).getSingleResult();
    }
}
