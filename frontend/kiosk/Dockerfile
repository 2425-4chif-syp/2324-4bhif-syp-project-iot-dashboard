FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY ./frontend/kiosk/dist/kiosk/browser/ /usr/share/nginx/html/
