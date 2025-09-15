package org.sensorapp.controller;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.sensorapp.infrastructure.config.ThresholdConfig;
import org.sensorapp.infrastructure.config.ThresholdService;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * REST API Controller zur Verwaltung von Schwellenwerten für Sensoren.
 * Stellt Endpunkte bereit, um Schwellenwerte für verschiedene Sensortypen abzurufen und zu aktualisieren.
 */
@Path("/thresholds")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class ThresholdController {

    @Inject
    ThresholdService thresholdService;

    private static final Logger LOGGER = Logger.getLogger(ThresholdController.class.getName());

    /**
     * Gibt alle konfigurierten Schwellenwerte zurück.
     *
     * @return Eine ThresholdConfig mit allen Schwellenwerten oder eine Fehlerantwort bei Problemen.
     */
    @GET
    public Response getAllThresholds() {
        try {
            ThresholdConfig thresholds = thresholdService.getThresholds();
            return Response.ok(thresholds).build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Schwellenwerte", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Abrufen der Schwellenwerte.")
                    .build();
        }
    }

    /**
     * Aktualisiert die Schwellenwerte für einen bestimmten Sensortyp.
     *
     * @param sensorType Der Sensortyp ('temperature', 'humidity' oder 'co2').
     * @param thresholds Die zu aktualisierenden Schwellenwerte.
     * @return Eine Erfolgs- oder Fehlerantwort.
     */
    @PUT
    @Path("/{sensorType}")
    public Response updateThresholds(
            @PathParam("sensorType") String sensorType,
            ThresholdConfig.SensorThreshold thresholds) {
        try {
            thresholdService.updateThresholds(sensorType, thresholds);
            return Response.ok().entity("Schwellenwerte für " + sensorType + " erfolgreich aktualisiert.").build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Ungültiger Sensortyp: " + sensorType)
                    .build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Aktualisieren der Schwellenwerte für " + sensorType, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Aktualisieren der Schwellenwerte für " + sensorType + ".")
                    .build();
        }
    }

    /**
     * Gibt die Schwellenwerte für einen bestimmten Sensortyp zurück.
     *
     * @param sensorType Der Sensortyp ('temperature', 'humidity' oder 'co2').
     * @return Die Schwellenwerte für den Sensortyp oder eine Fehlerantwort.
     */
    @GET
    @Path("/{sensorType}")
    public Response getThresholdsForType(@PathParam("sensorType") String sensorType) {
        try {
            ThresholdConfig.SensorThreshold thresholds = thresholdService.getThresholdsForType(sensorType);
            if (thresholds == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Keine Schwellenwerte für Sensortyp '" + sensorType + "' gefunden.")
                        .build();
            }
            return Response.ok(thresholds).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Ungültiger Sensortyp: " + sensorType)
                    .build();
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fehler beim Abrufen der Schwellenwerte für " + sensorType, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Fehler beim Abrufen der Schwellenwerte für " + sensorType + ".")
                    .build();
        }
    }
}
