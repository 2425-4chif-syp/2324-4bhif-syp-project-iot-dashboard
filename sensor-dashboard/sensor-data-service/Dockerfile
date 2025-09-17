# Einfaches Runtime-only Dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the pre-built jar file
COPY target/*-runner.jar /app/app.jar

EXPOSE 8080

CMD ["java", "-jar", "/app/app.jar"]
