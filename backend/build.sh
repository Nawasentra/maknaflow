#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Building with uv ---"

# 1. Install dependencies
# --frozen ensures we use exactly the versions in uv.lock
uv sync --frozen --no-dev

# 2. Collect Static Files
# We use 'uv run' to execute commands inside the virtual environment uv created
echo "--- Collecting Static Files ---"
uv run python manage.py collectstatic --no-input

# 3. Run Migrations
echo "--- Running Migrations ---"
uv run python manage.py migrate

# 4. Create Superuser (if not exists)
echo "--- Creating Superuser ---"
uv run python manage.py create_superuser