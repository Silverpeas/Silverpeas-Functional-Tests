# Silverpeas Functional Tests

Functional tests of [Silverpeas](https://www.silverpeas.org) written with
[Playwright](https://playwright.dev), run against a Silverpeas instance bootstrapped with Docker
Compose. The suite is made up of a set of smoke tests and is enriched with a test for each bug to
fix: the test first validates the bug is reproduced (it fails) and then that the fix works (it
passes).

## Prerequisites

* Docker with the Docker Compose plugin.
* The `silverpeas-run` Docker image (project `silverpeas-run` of the Silverpeas Docker projects):
  it provides the Silverpeas installer, Wildfly, Java and the dataset matching the database dump in
  `docker/dataset/`.
* Node.js 22 or later.

```shell
npm install
npx playwright install chromium
```

## The test environment

It is described by `docker/compose.yml` and parameterized by `docker/.env` (created from
`docker/.env.example` at the first run). It is made up of:

| Service      | Role                                                     | Host access                          |
|--------------|----------------------------------------------------------|--------------------------------------|
| `silverpeas` | Silverpeas, installed at startup in `SILVERPEAS_VERSION` | http://localhost:8380/silverpeas     |
| `database`   | PostgreSQL, initialized from the dataset dump            | –                                    |
| `mailpit`    | catches all the emails sent by Silverpeas                | http://localhost:8325 (UI and API)   |

At its startup, the Silverpeas container sets the version given by `SILVERPEAS_VERSION` in
`bin/silverpeas.gradle` and then runs `silverpeas upgrade` and `silverpeas start`. The artifacts are
looked for first in the local Maven repository of the host (mounted read-only), then in the
Silverpeas Nexus repository. So:

* `SILVERPEAS_VERSION=6.5-SNAPSHOT` installs what has been built locally (`mvn install`); a SNAPSHOT
  version is reinstalled at each container start;
* `SILVERPEAS_VERSION=6.5-build261119` installs a given build from Nexus.

```shell
./scripts/env-up.sh                                     # starts the environment and waits for Silverpeas
SILVERPEAS_VERSION=6.5-build261119 ./scripts/env-up.sh  # same, for a given version
./scripts/env-redeploy.sh                               # reinstalls Silverpeas (after a mvn install), data kept
./scripts/env-reset.sh                                  # back to the initial dataset
./scripts/env-down.sh [--volumes]                       # stops the environment
```

The first startup takes several minutes (download of the installer and of the Silverpeas
artifacts, cached then in a volume). In case of failure, see `docker compose logs silverpeas`
(from the `docker` directory).

When the Silverpeas installer (the `silversetup` Gradle plugin declared in `bin/settings.gradle`)
is updated, rebuild the `silverpeas-run` image and update `SILVERPEAS_IMAGE` in `docker/.env`.

### Configuration and dataset

* `docker/config.properties`: global configuration of Silverpeas (database, SMTP → Mailpit, ...).
* `docker/CustomerSettings.xml`: customization of the Silverpeas settings.
* `docker/dataset/silverpeas.sql`: the database dump of the dataset (from `silverpeas-run`).
* `docker/dataset/z-test-credentials.sql`: sets well-known passwords to the users of the dataset.

| User          | Domain           | Password      | Role in the tests             |
|---------------|------------------|---------------|-------------------------------|
| `SilverAdmin` | Silverpeas (0)   | `SilverAdmin` | administrator (`adminPage`)   |
| `jdoo1`…`jdoo45` | Snowpeas (1)  | `silverpeas`  | `jdoo3` is the default user (`page`) |

## Running the tests

```shell
npm test                                  # all the tests
npm run test:smoke                        # only the smoke tests
npx playwright test --grep @bug15549      # the tests of a given bug
npm run test:ui                           # interactive mode
npm run report                            # HTML report of the last run
```

The URL of the Silverpeas under test can be changed with `SILVERPEAS_URL` (by default
`http://localhost:${HTTP_PORT:-8380}`).

## Layout

```
docker/            the test environment (Docker Compose)
scripts/           scripts to manage the test environment
support/           test support: users, fixtures, authentication setup, page objects (pages/)
tests/smoke/       smoke tests (tag @smoke)
tests/features/    tests per Silverpeas application
tests/bugs/        a test per bug (tag @bug<ticket>), see tests/bugs/README.md
```

## Writing tests

* Import `test` and `expect` from `support/fixtures`: the `page` fixture is already signed in as a
  simple user, `adminPage` as the administrator.
* Encapsulate the interactions with a Silverpeas page into a page object in `support/pages/`.
* A test must not depend on another one nor on the order of execution: it creates its own data
  with unique names (`uniqueName` fixture).
* Prefer the locators by role, label or text, then by stable identifiers.
