# Build stage
FROM maven:3.9.4-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom and source
COPY pom.xml ./
COPY src/ ./src/

# Build the application using Maven directly
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built jar from build stage
COPY --from=build /app/target/quarkus-app/lib/ /app/lib/
COPY --from=build /app/target/quarkus-app/*.jar /app/
COPY --from=build /app/target/quarkus-app/app/ /app/app/
COPY --from=build /app/target/quarkus-app/quarkus/ /app/quarkus/

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
