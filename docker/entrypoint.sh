#!/usr/bin/env bash
#
# Entrypoint of the Silverpeas container of the functional tests environment.
#
# At startup, it installs (upgrades) the version of Silverpeas given by the SILVERPEAS_VERSION
# environment variable and then starts Silverpeas. The container then stays in the foreground by
# following the server log until it is stopped (SIGTERM), in which case Silverpeas is stopped
# gracefully.
#
# Environment variables:
#   SILVERPEAS_VERSION  the version of Silverpeas to install (e.g. 6.5-SNAPSHOT, 6.5-build261119).
#                       The artifacts are looked for first in the local Maven repository (mounted
#                       from the host) and then in the Silverpeas Nexus repository.
#   FORCE_UPGRADE       if true, upgrade Silverpeas even if the requested version is already
#                       installed in the container. Any SNAPSHOT version is always upgraded.
#   SILVERPEAS_DEBUG    if true, start Silverpeas in debug mode (JPDA on port 5005).
#
set -uo pipefail

cd "${SILVERPEAS_HOME}/bin" || exit 1

readonly REQUESTED_VERSION="${SILVERPEAS_VERSION:?The SILVERPEAS_VERSION environment variable must be set}"
readonly MARKER="${SILVERPEAS_HOME}/.installed-version"
readonly LOG_DIR="${SILVERPEAS_HOME}/log"

tail_pid=

log() {
  echo "[silverpeas-entrypoint] $*"
}

print_build_logs() {
  for f in "${LOG_DIR}"/build-*; do
    [ -f "$f" ] && tail -n 200 "$f"
  done
}

stop_silverpeas() {
  log "Stop Silverpeas..."
  ./silverpeas stop
  [ -n "${tail_pid}" ] && kill "${tail_pid}" 2>/dev/null
  exit 0
}

need_upgrade() {
  [ "${FORCE_UPGRADE:-false}" = "true" ] && return 0
  [[ "${REQUESTED_VERSION}" == *-SNAPSHOT ]] && return 0
  [ ! -f "${MARKER}" ] && return 0
  [ "$(cat "${MARKER}")" != "${REQUESTED_VERSION}" ]
}

trap stop_silverpeas SIGTERM SIGINT SIGQUIT

# At the first start with a new data volume, removes the indexes of the dataset: they are in a
# Lucene format too old for the current Silverpeas version and then no indexing can be done.
# Silverpeas creates them again (only the contents created by the tests are then indexed).
readonly DATA_MARKER="${SILVERPEAS_HOME}/data/.functional-tests-initialized"
if [ ! -f "${DATA_MARKER}" ]; then
  log "First start with the dataset: remove its obsolete indexes"
  rm -rf "${SILVERPEAS_HOME}/data/index"
  touch "${DATA_MARKER}"
fi

if need_upgrade; then
  log "Set the version of Silverpeas to install: ${REQUESTED_VERSION}"
  sed -i -E "s/^version[[:space:]]*=.*/version = '${REQUESTED_VERSION}'/" silverpeas.gradle
  log "Upgrade Silverpeas to ${REQUESTED_VERSION}..."
  if ! ./silverpeas upgrade; then
    log "Error while upgrading Silverpeas to ${REQUESTED_VERSION}"
    print_build_logs
    exit 1
  fi
  echo "${REQUESTED_VERSION}" > "${MARKER}"
else
  log "Silverpeas ${REQUESTED_VERSION} already installed: no upgrade"
fi

start_task=start
[ "${SILVERPEAS_DEBUG:-false}" = "true" ] && start_task=debug
log "Start Silverpeas (${start_task})..."
if ! ./silverpeas "${start_task}"; then
  log "Error while starting Silverpeas"
  print_build_logs
  tail -n 200 "${LOG_DIR}"/*.log 2>/dev/null
  exit 1
fi
log "Silverpeas ${REQUESTED_VERSION} started"

# Stay in the foreground by following the Wildfly output and the Silverpeas errors; wait is
# interruptible by the trapped signals
tail -n 0 -F "${LOG_DIR}/jboss-output.log" "${LOG_DIR}/silverpeas-error.log" 2>/dev/null &
tail_pid=$!
wait "${tail_pid}"
