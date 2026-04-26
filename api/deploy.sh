#!/bin/bash
set -e
cd /var/www/palmyra/api
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt --break-system-packages
python manage.py migrate
deactivate
sudo systemctl restart palmyra-api
