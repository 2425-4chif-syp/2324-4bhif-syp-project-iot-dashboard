#!/bin/bash

# Define the Docker Compose file name
COMPOSE_FILE="docker-compose.yaml"

# Ensure the script exits on any command failure
set -e

echo "Stopping and removing all containers..."
docker compose -f "$COMPOSE_FILE" down

echo "Removing all images for the services defined in $COMPOSE_FILE..."
IMAGES=$(docker compose -f "$COMPOSE_FILE" config | awk '/image:/ {print $2}')
for IMAGE in $IMAGES; do
  echo "Removing image: $IMAGE"
  docker rmi -f "$IMAGE" || echo "Image $IMAGE does not exist locally, skipping removal."
done

echo "Pulling fresh images from the registry..."
docker compose -f "$COMPOSE_FILE" pull

echo "Starting services in detached mode..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Docker Compose project refreshed successfully!"
