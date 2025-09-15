package org.sensorapp.infrastructure.influxdb.DTOs;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class SensorDataDTO {
    @JsonProperty("timestamp")
    private Instant timestamp;

    @JsonProperty("sensorType")
    private String sensorType;

    @JsonProperty("value")
    private double value;

    public SensorDataDTO(Instant timestamp, String sensorType, double value) {
        this.timestamp = timestamp;
        this.sensorType = sensorType;
        this.value = value;
    }
}
