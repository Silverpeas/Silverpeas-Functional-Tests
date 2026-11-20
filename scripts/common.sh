# Common functions of the environment scripts. To be sourced.

readonly PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DOCKER_DIR="${PROJECT_DIR}/docker"

if [ ! -f "${DOCKER_DIR}/.env" ]; then
  echo "No ${DOCKER_DIR}/.env file: creation from .env.example"
  cp "${DOCKER_DIR}/.env.example" "${DOCKER_DIR}/.env"
fi

compose() {
  docker compose --project-directory "${DOCKER_DIR}" -f "${DOCKER_DIR}/compose.yml" "$@"
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
