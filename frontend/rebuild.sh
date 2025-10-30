#!/bin/bash

# Remove old node_modules and lock files
rm -rf node_modules
rm -f package-lock.json

# Clean npm cache
npm cache clean --force

# Install dependencies and create new lock file
npm install

# Build the project
npm run build
