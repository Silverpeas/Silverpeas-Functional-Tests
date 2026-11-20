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
* `docker/dataset/z-test-credentials.sql`: sets well-known passwords to the users of the dataset:
  `SilverAdmin` for `SilverAdmin`, `silverpeas` for all the other users.

At the first start with a new data volume, the container removes the Lucene indexes of the
dataset: they are in a format too old for master and they prevent any indexing. Hence only the
contents created by the tests can be found by the search engine.

### Users of the tests

Each role is played by a pool of users of the dataset, one user per parallel worker, so that a same
user is never signed in by two tests at the same time (see `support/users.ts`):

| Role        | Users                                         | Rights                                   |
|-------------|-----------------------------------------------|------------------------------------------|
| `admin`     | `SilverAdmin` (domain Silverpeas)             | administrator of the platform            |
| `publisher` | `cvaldor`, `sorvane`, `tlambrec`, `mquentel`, `npeyrelle` (domain Silverpeas) | group Publieurs: publishers in the Kmelia of the Espace Collaboratif |
| `writer`    | `jdoo1`, `jdoo10`, `jdoo11`, `jdoo100`, `jdoo101` (domain Snowpeas) | group Rédacteurs |
| `user`      | `jdoo3` … `jdoo7` (domain Snowpeas)           | group Lecteurs: simple readers           |

Hence, at most 5 workers can be used.

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
support/           test support: users, fixtures, Mailpit client, page objects (pages/)
tests/smoke/       smoke tests (tag @smoke)
tests/features/    tests per Silverpeas application (tag @smoke for the essential ones)
tests/bugs/        a test per bug (tag @bug<ticket>), see tests/bugs/README.md
```

## Writing tests

* Import `test` and `expect` from `support/fixtures`:
  * `page` is signed in as a simple reader (`test.use({ signedInAs: 'publisher' })` to change the
    role, `null` for an anonymous page), `adminPage`, `publisherPage` and `writerPage` are signed
    in with the corresponding role, each in its own browser context;
  * `accounts` gives the users playing each role in the test;
  * `uniqueName` and `uniqueWord` give names unique to the test for the data it creates;
  * `mailpit` checks the emails sent by Silverpeas.
* Each page signs in with its own session: Silverpeas binds a security token to the session, so a
  session can't be shared between tests running in parallel.
* The applications can be accessed directly by their router (e.g. `/silverpeas/Rkmelia/kmelia1/Main`)
  or within the portal, where the content part is the `#MyMain` iframe (see `PortalPage`).
* The tests run with a window of 1280 px wide: the navigation panel of the spaces is then hidden
  and the applications of a space are in a sub-menu of the main menu.
* Encapsulate the interactions with a Silverpeas page into a page object in `support/pages/`.
* A test must not depend on another one nor on the order of execution: it creates its own data
  with unique names (`uniqueName` fixture).
* Prefer the locators by role, label or text, then by stable identifiers.
