#!/usr/bin/env bash
#
# Starts the functional tests environment and waits for Silverpeas to be ready.
# The version of Silverpeas to install can be given by the SILVERPEAS_VERSION environment variable,
# otherwise the one in docker/.env is taken.
#   ./scripts/env-up.sh
#   SILVERPEAS_VERSION=6.5-build261119 ./scripts/env-up.sh
#
set -euo pipefail
source "$(dirname "$0")/common.sh"

compose up -d --build
wait_for_silverpeas
