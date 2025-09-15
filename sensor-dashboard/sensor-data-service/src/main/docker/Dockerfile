FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY target/*-runner.jar /app/app.jar
EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]