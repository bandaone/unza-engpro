#!/bin/sh
set -e # Exit immediately if a command exits with a non-zero status.

# Navigate to the app directory
cd /opt/timetable

# Log in to GitHub Container Registry
# The password is provided by the CI/CD runner
echo $CR_PAT | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

# Pull the latest version of the app image
docker-compose pull app

# Stop the current running app and start the new one
# --force-recreate ensures the container is recreated with the new image
docker-compose up -d --force-recreate app

# Clean up old, unused Docker images to save disk space
docker image prune -f


echo "Deployment successful!"
