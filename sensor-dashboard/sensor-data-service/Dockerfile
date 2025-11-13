# Build stage
FROM maven:3.9.4-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom and source (including resources)
COPY pom.xml ./
COPY src/ ./src/

# Build the application using Maven directly (Uber-JAR)
# Force rebuild by touching application.properties
RUN touch src/main/resources/application.properties && \
    mvn clean package -DskipTests -Dquarkus.package.type=uber-jar

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the uber-jar
COPY --from=build /app/target/*-runner.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
