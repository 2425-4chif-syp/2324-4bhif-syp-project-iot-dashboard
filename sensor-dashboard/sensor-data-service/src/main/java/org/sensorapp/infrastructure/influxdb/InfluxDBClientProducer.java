package org.sensorapp.infrastructure.influxdb;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class InfluxDBClientProducer {

    @ConfigProperty(name = "influxdb.url")
    String influxdbUrl;

    @ConfigProperty(name = "influxdb.token")
    String influxdbToken;

    @ConfigProperty(name = "influxdb.org")
    String influxdbOrg;

    @ConfigProperty(name = "influxdb.bucket")
    String influxdbBucket;

    @Produces
    @Singleton
    public InfluxDBClient createInfluxDBClient() {
        System.out.println("🔧 Creating InfluxDBClient with URL: " + influxdbUrl);
        return InfluxDBClientFactory.create(influxdbUrl, influxdbToken.toCharArray(), influxdbOrg, influxdbBucket);
    }
}

