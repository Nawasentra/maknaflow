#!/usr/bin/env bash
# Exit on error
set -o errexit

# 1. Install Dependencies
pip install -r requirements.txt

# 2. Collect Static Files
python manage.py collectstatic --no-input

# 3. Run Migrations
python manage.py migrate
