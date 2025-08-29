FROM nginx:stable

# Der Pfad ist relativ zum Build-Kontext (Projektverzeichnis)
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Angular-Build-Output – muss vorhanden sein!
COPY kiosk/dist/kiosk/browser/ /usr/share/nginx/html/