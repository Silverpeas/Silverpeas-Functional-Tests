#!/usr/bin/env bash
#
# Runs the functional tests as done by the continuous integration, in a new and isolated
# environment: no port is published on the host (docker/compose.ci.yml) and the tests are run by
# Playwright in a container attached to the Docker network of the environment. Only Docker is
# required on the host. The environment is removed at the end, whatever the result of the tests.
#
#   SILVERPEAS_VERSION=<version> [MAVEN_REPOSITORY=<dir>] ./scripts/ci-run.sh [playwright options]
#
# Environment variables:
#   SILVERPEAS_VERSION    the version of Silverpeas to test (required)
#   MAVEN_REPOSITORY      the Maven repository with the Silverpeas artifacts of this version, if
#                         they aren't in the Silverpeas Nexus repository (default ~/.m2/repository)
#   COMPOSE_PROJECT_NAME  the name of the environment (default silverpeas-ft-ci)
#   SILVERPEAS_IMAGE      the base image of Silverpeas (default the one in docker/.env)
#
# The reports are written in the reports directory: JUnit report, logs of Silverpeas. The HTML
# report of Playwright is in playwright-report and the traces of the failed tests in test-results.
# The exit status is the one of Playwright: 0 if all the tests passed.
#
set -euo pipefail

: "${SILVERPEAS_VERSION:?The version of Silverpeas to test must be set in SILVERPEAS_VERSION}"
export SILVERPEAS_VERSION
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-silverpeas-ft-ci}
export COMPOSE_OVERRIDES=compose.ci.yml
if [ -n "${MAVEN_REPOSITORY:-}" ]; then
  MAVEN_REPOSITORY=$(realpath "${MAVEN_REPOSITORY}")
  export MAVEN_REPOSITORY
fi

source "$(dirname "$0")/common.sh"

readonly REPORTS_DIR="${PROJECT_DIR}/reports"
playwright_version=$(sed -n 's/.*"@playwright\/test": *"\([^"]*\)".*/\1/p' "${PROJECT_DIR}/package.json")
readonly PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v${playwright_version}-noble"

# Saves the logs of Silverpeas into the reports and removes the environment
cleanup() {
  echo "Save the logs of Silverpeas into ${REPORTS_DIR}..."
  compose logs --no-color silverpeas > "${REPORTS_DIR}/silverpeas-container.log" 2>&1 || true
  local cid
  cid=$(compose ps -a -q silverpeas 2> /dev/null || true)
  if [ -n "$cid" ]; then
    docker cp -q "$cid:/home/silveruser/silverpeas/log" "${REPORTS_DIR}/silverpeas-logs" 2> /dev/null || true
  fi
  echo "Remove the environment ${COMPOSE_PROJECT_NAME}..."
  compose down --volumes --remove-orphans > /dev/null 2>&1 || true
}

rm -rf "${REPORTS_DIR}" "${PROJECT_DIR}/test-results" "${PROJECT_DIR}/playwright-report"
mkdir -p "${REPORTS_DIR}"

echo "Start the environment ${COMPOSE_PROJECT_NAME} with Silverpeas ${SILVERPEAS_VERSION}..."
compose down --volumes --remove-orphans > /dev/null 2>&1 || true
trap cleanup EXIT
compose up -d --build --quiet-pull
wait_for_silverpeas

echo "Run the functional tests with ${PLAYWRIGHT_IMAGE}..."
# the dependencies are installed in a tmpfs so that the node_modules of the project, if any, isn't
# modified; the files written by the tests are owned by the current user
set +e
docker run --rm --init --ipc=host \
  --network "${COMPOSE_PROJECT_NAME}_default" \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -e CI=true \
  -e SILVERPEAS_URL=http://silverpeas:8000 \
  -e MAILPIT_URL=http://mailpit:8025 \
  -v "${PROJECT_DIR}:/work" -w /work \
  --tmpfs "/work/node_modules:rw,exec,uid=$(id -u),gid=$(id -g),size=1g" \
  "${PLAYWRIGHT_IMAGE}" \
  bash -c 'npm ci --no-audit --no-fund --loglevel=error && npx playwright test "$@"' -- "$@"
status=$?
set -e

if [ $status -eq 0 ]; then
  echo "All the functional tests passed"
else
  echo "Some functional tests failed (exit status ${status})"
fi
exit $status
