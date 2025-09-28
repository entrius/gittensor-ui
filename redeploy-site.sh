#!/bin/bash

cd /home/eesaw/gittensor-ui

git fetch && git reset origin/main --hard

docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
exit 0