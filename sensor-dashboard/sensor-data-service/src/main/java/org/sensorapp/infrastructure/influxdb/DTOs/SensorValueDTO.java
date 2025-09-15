package org.sensorapp.infrastructure.influxdb.DTOs;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class SensorValueDTO {
    @JsonProperty("timestamp")
    private Instant timestamp;

    @JsonProperty("value")
    private double value;

    public SensorValueDTO(Instant timestamp, double value) {
        this.timestamp = timestamp;
        this.value = value;
    }
}
