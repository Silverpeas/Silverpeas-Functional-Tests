#!/usr/bin/env bash
#
# Reinstalls Silverpeas (for example after having built locally a fix with mvn install) by
# recreating the Silverpeas container. The database and the data of Silverpeas are kept.
# The version can be changed with the SILVERPEAS_VERSION environment variable.
#
set -euo pipefail
source "$(dirname "$0")/common.sh"

compose up -d --build --force-recreate --no-deps silverpeas
wait_for_silverpeas
