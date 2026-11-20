#!/usr/bin/env bash
#
# Rebuilds the Lucene indexes matching a dataset: a temporary environment is started from the given
# database dump without any index, the whole platform is reindexed from the back office of
# Silverpeas, and the indexes are then copied into the given directory (its content is replaced).
# The temporary environment runs on its own ports and is removed at the end; the environment of
# the tests isn't touched.
#
#   ./scripts/rebuild-index.sh <output directory> [database dump]
#
# By default, the dump is the one of the functional tests (docker/dataset/silverpeas.sql). For
# example, to rebuild the indexes of the dataset of the tests:
#   ./scripts/rebuild-index.sh docker/dataset/index
#
set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi
output=$(realpath -m "$1")
dump=$(realpath "${2:-$(dirname "$0")/../docker/dataset/silverpeas.sql}")

export COMPOSE_PROJECT_NAME=silverpeas-ft-index
export HTTP_PORT=${INDEX_HTTP_PORT:-8390}
export DEBUG_PORT=${INDEX_DEBUG_PORT:-5315}
export MAILPIT_PORT=${INDEX_MAILPIT_PORT:-8335}
export DATASET_DUMP="${dump}"
# no index at startup: they are all built by the reindexation
empty_index=$(mktemp -d)
export DATASET_INDEX="${empty_index}"

source "$(dirname "$0")/common.sh"

cleanup() {
  echo "Remove the temporary environment ${COMPOSE_PROJECT_NAME}..."
  compose down --volumes --remove-orphans > /dev/null 2>&1 || true
  rmdir "${empty_index}" 2> /dev/null || true
}
trap cleanup EXIT

echo "Start a temporary environment ${COMPOSE_PROJECT_NAME} with the dump ${dump}..."
compose down --volumes --remove-orphans > /dev/null 2>&1 || true
compose up -d --build
wait_for_silverpeas

node "${PROJECT_DIR}/scripts/reindex-platform.mjs" "http://localhost:${HTTP_PORT}"

# the indexation requests are processed asynchronously: wait for the indexes to be stable
cid=$(compose ps -q silverpeas)
index_state() {
  docker exec "$cid" bash -c 'find ~/silverpeas/data/index -type f -printf "%p %s %T@\n" | sort | md5sum'
}
echo -n "Wait for the indexes to be stable"
previous=""
current=$(index_state)
while [ "$current" != "$previous" ]; do
  echo -n "."
  sleep 10
  previous=$current
  current=$(index_state)
done
echo " done"

echo "Copy the indexes into ${output}..."
rm -rf "${output}"
docker cp -q "$cid:/home/silveruser/silverpeas/data/index" "${output}"
echo "$(find "${output}" -type f | wc -l) files, $(du -sh "${output}" | cut -f1)"
