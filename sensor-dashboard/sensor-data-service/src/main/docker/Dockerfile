# Build stage
FROM maven:3.9.4-eclipse-temurin-21 AS build

WORKDIR /app

# Copy Maven files for dependency resolution
COPY pom.xml ./
COPY .mvn/ .mvn/
COPY mvnw ./

# Make mvnw executable
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:resolve

# Copy source code
COPY src/ src/

# Build the application
RUN ./mvnw clean package -Dquarkus.package.type=uber-jar -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built jar from build stage
COPY --from=build /app/target/*-runner.jar /app/app.jar

EXPOSE 8080

CMD ["java", "-jar", "/app/app.jar"]