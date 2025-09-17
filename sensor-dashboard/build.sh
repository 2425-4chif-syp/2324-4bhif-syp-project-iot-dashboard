#!/bin/bash

echo "🔨 Building Sensor Dashboard..."

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the sensor-dashboard directory"
    exit 1
fi

echo "📁 Current directory contents:"
ls -la

echo ""
echo "🔨 Building Quarkus application..."

# Wechsle ins sensor-data-service Verzeichnis
cd sensor-data-service

echo "📁 sensor-data-service directory contents:"
ls -la

# Prüfe ob mvnw existiert und ist ausführbar
if [ ! -f "./mvnw" ]; then
    echo "❌ Maven wrapper (mvnw) not found!"
    exit 1
fi

# Mache mvnw ausführbar falls nötig
chmod +x ./mvnw

# Baue die Anwendung
echo "🏗️  Building with Maven..."
./mvnw clean package -Dquarkus.package.type=uber-jar -DskipTests

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 JAR files in target/ directory:"
    ls -la target/*.jar 2>/dev/null || echo "⚠️  No JAR files found in target/"
    
    # Prüfe spezifisch nach runner JAR
    if ls target/*-runner.jar 1> /dev/null 2>&1; then
        echo "✅ Found runner JAR file!"
    else
        echo "⚠️  No *-runner.jar found, but other JARs might work"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

cd ..

echo ""
echo "🐳 Now you can run: docker-compose up -d"
