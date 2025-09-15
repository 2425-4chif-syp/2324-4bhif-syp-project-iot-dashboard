package org.sensorapp.infrastructure.influxdb;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

@ApplicationScoped
public class InfluxDBClientProducer {

    private static final String INFLUXDB_URL = "http://127.0.0.1:8086";
    private static final String INFLUXDB_TOKEN = "kSVvcPgB5NGbQC2NVo28nR8YyKjTohIZNhfu7AoKoaxrEkt6CtdKG4lZWQY1zDD0o1uKEUezQScLxjDRMBcuNw==";
    private static final String INFLUXDB_ORG = "sensor_org";
    private static final String INFLUXDB_BUCKET = "sensor_bucket";

    @Produces
    @Singleton
    public InfluxDBClient createInfluxDBClient() {
        return InfluxDBClientFactory.create(INFLUXDB_URL, INFLUXDB_TOKEN.toCharArray(), INFLUXDB_ORG, INFLUXDB_BUCKET);
    }
}

