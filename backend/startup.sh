#!/bin/bash

# Exit on error
set -e

echo "--- STARTING AZURE APP SERVICE ---"

# 1. Run Migrations
echo "Running Migrations..."
python manage.py migrate --noinput

# 2. Collect Static
echo "Collecting Static..."
python manage.py collectstatic --noinput

# 3. Start Gunicorn
# CRITICAL: We bind to 0.0.0.0:8000 explicitly.
# Azure listens on port 8000 inside the container by default for Python images.
echo "Starting Gunicorn..."
python -m gunicorn --bind 0.0.0.0:8000 --timeout 600 --chdir . config.wsgi:application