#!/usr/bin/env bash

set -e

pushd frontend/kiosk
  npm install
  npx ng build --configuration production kiosk
popd

mkdir -p dist/kiosk

cp -r frontend/kiosk/dist/kiosk/browser/* dist/kiosk
