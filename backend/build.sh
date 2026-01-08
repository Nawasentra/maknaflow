#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Starting Build with uv ---"

# Install dependencies using uv sync
# --frozen ensures we use exactly what's in uv.lock
uv sync --frozen --no-dev

# Collect static files
echo "--- Collecting Static Files ---"
uv run python manage.py collectstatic --no-input

# Run migrations
echo "--- Running Migrations ---"
uv run python manage.py migrate

echo "--- Build Complete ---"