#!/usr/bin/env bash
#
# Resets the functional tests environment to its initial state: the database and the data of
# Silverpeas are removed and then restored from the dataset. The Gradle cache is kept.
#
set -euo pipefail
source "$(dirname "$0")/common.sh"

project=$(compose config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')
compose down
docker volume rm -f "${project}_silverpeas-data" "${project}_postgresql-data" > /dev/null
compose up -d --build
wait_for_silverpeas
