# Stage 1: Build the Angular application
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --prod

# Debugging step: Check contents of /app/dist/kiosk
RUN ls -la /app/dist/kiosk

# Stage 2: Serve the Angular application with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist/kiosk/browser /usr/share/nginx/html
EXPOSE 80

