docker-compose -f grafana.yaml -f influxdb.yaml -f frontend.yaml -f leoenergy.yaml down

echo "building frontend"

cd ..
frontend/build.sh

cd compose

echo "building compose images"

docker-compose -f grafana.yaml -f influxdb.yaml -f frontend.yaml -f leoenergy.yaml build

echo "starting services"

docker-compose -f grafana.yaml -f influxdb.yaml -f frontend.yaml -f leoenergy.yaml up -d
