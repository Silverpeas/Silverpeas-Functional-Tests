#!/usr/bin/env bash
#
# Stops the functional tests environment. With --volumes, removes also all the volumes (database,
# data of Silverpeas and Gradle cache).
#
set -euo pipefail
source "$(dirname "$0")/common.sh"

compose down "$@"
