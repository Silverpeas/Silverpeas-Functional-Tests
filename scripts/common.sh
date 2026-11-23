# Common functions of the environment scripts. To be sourced.

readonly PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DOCKER_DIR="${PROJECT_DIR}/docker"

if [ ! -f "${DOCKER_DIR}/.env" ]; then
  echo "No ${DOCKER_DIR}/.env file: creation from .env.example"
  cp "${DOCKER_DIR}/.env.example" "${DOCKER_DIR}/.env"
fi

# Gradle cache shared by all the environments (declared as external in compose.yml)
docker volume create silverpeas-ft-gradle-cache > /dev/null

# Additional Compose files overriding compose.yml (space-separated paths relative to the docker
# directory), e.g. compose.ci.yml for the continuous integration
COMPOSE_OVERRIDES=${COMPOSE_OVERRIDES:-}

compose() {
  local files=(-f "${DOCKER_DIR}/compose.yml")
  for override in ${COMPOSE_OVERRIDES}; do
    files+=(-f "${DOCKER_DIR}/${override}")
  done
  docker compose --project-directory "${DOCKER_DIR}" "${files[@]}" "$@"
}

# Waits for the Silverpeas service to be healthy. Fails if the container exits or is unhealthy.
wait_for_silverpeas() {
  local timeout=${1:-1200}
  local start=$SECONDS
  local cid status
  cid=$(compose ps -a -q silverpeas)
  echo -n "Waiting for Silverpeas to be up (this can take several minutes)"
  while true; do
    status=$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid")
    case "$status" in
      running/healthy)
        echo " up"
        return 0 ;;
      exited/*|dead/*|*/unhealthy)
        echo " FAILED ($status)"
        compose logs --tail 200 silverpeas
        return 1 ;;
    esac
    if (( SECONDS - start > timeout )); then
      echo " TIMEOUT"
      compose logs --tail 200 silverpeas
      return 1
    fi
    echo -n "."
    sleep 10
  done
}
