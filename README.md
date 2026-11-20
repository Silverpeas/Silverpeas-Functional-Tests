# Silverpeas Functional Tests

Functional tests of [Silverpeas](https://www.silverpeas.org) written with
[Playwright](https://playwright.dev), run against a Silverpeas instance bootstrapped with Docker
Compose. The suite is made up of a set of smoke tests and is enriched with a test for each bug to
fix: the test first validates the bug is reproduced (it fails) and then that the fix works (it
passes).

## Prerequisites

* Docker with the Docker Compose plugin.
* The `silverpeas-run` Docker image (project `silverpeas-run` of the Silverpeas Docker projects):
  it provides the Silverpeas installer, Wildfly, Java and the files of the dataset (attachments,
  JCR, ...).
* Node.js 22 or later.

## Quick start

```shell
npm install
npx playwright install chromium
./scripts/env-up.sh       # starts the test environment (several minutes the first time)
npm test                  # runs all the tests
```

## The test environment

It is described by `docker/compose.yml` and parameterized by `docker/.env` (created from
`docker/.env.example` at the first run). It is made up of:

| Service      | Role                                                     | Host access                          |
|--------------|----------------------------------------------------------|--------------------------------------|
| `silverpeas` | Silverpeas, installed at startup in `SILVERPEAS_VERSION` | http://localhost:8380/silverpeas     |
| `database`   | PostgreSQL, initialized from the dataset dump            | –                                    |
| `mailpit`    | catches all the emails sent by Silverpeas                | http://localhost:8325 (UI and API)   |

No email sent by Silverpeas can leave the environment: they are all caught by Mailpit.

### Version of Silverpeas

At its startup, the Silverpeas container sets the version given by `SILVERPEAS_VERSION` in
`bin/silverpeas.gradle` and then runs `silverpeas upgrade` and `silverpeas start`. The artifacts are
looked for first in the local Maven repository of the host (mounted read-only), then in the
Silverpeas Nexus repository. So:

* `SILVERPEAS_VERSION=6.5-SNAPSHOT` installs what has been built locally (`mvn install`); a SNAPSHOT
  version is reinstalled at each container start;
* `SILVERPEAS_VERSION=6.5-build261119` installs a given build from Nexus.

When the Silverpeas installer (the `silversetup` Gradle plugin declared in `bin/settings.gradle`)
is updated, rebuild the `silverpeas-run` image and update `SILVERPEAS_IMAGE` in `docker/.env`.

### Managing the environment

```shell
./scripts/env-up.sh                                     # starts the environment and waits for Silverpeas
SILVERPEAS_VERSION=6.5-build261119 ./scripts/env-up.sh  # same, for a given version
./scripts/env-redeploy.sh                               # reinstalls Silverpeas (after a mvn install), data kept
./scripts/env-reset.sh                                  # back to the initial dataset
./scripts/env-down.sh [--volumes]                       # stops the environment
./scripts/rebuild-index.sh docker/dataset/index         # rebuilds the indexes of the dataset (see below)
```

The first startup takes several minutes (download of the installer and of the Silverpeas
artifacts, cached then in the volume `silverpeas-ft-gradle-cache`). In case of failure, see
`docker compose logs silverpeas` (from the `docker` directory) and the logs of Silverpeas in the
container (`/home/silveruser/silverpeas/log`).

To debug Silverpeas, set `SILVERPEAS_DEBUG=true` in `docker/.env`: it is then started in debug mode
and the JPDA port is published on the host port 5305.

## The dataset

The environment starts with a ready-to-use dataset:

* the domains Silverpeas (id 0) and Snowpeas (id 1, an SQL domain with the users `jdoo1`,
  `jdoo2`, ...), and the groups Publieurs, Rédacteurs and Lecteurs;
* the space Espace Collaboratif with the applications Documentation (Kmelia `kmelia1`, draft mode
  enabled), Médiathèque, Agenda Partagé, Formulaires en ligne, Boîte à Idées, Vote, Enquête and
  Blog;
* the space Espace Silverpeas with an application Documentation (`kmelia6`) and the sub-spaces
  Espace Projets > Tartempion (Documentation, Blog, Agenda and Contacts).

It is made up of:

* `docker/dataset/silverpeas.sql`: the database dump;
* `docker/dataset/z-test-credentials.sql`: sets well-known passwords to the users of the dataset:
  `SilverAdmin` for `SilverAdmin`, `silverpeas` for all the other users;
* `docker/dataset/index`: the Lucene indexes matching the dump, in the format of the tested version
  of Silverpeas. They are installed at the first start with a new data volume;
* the files of the contributions (attachments, JCR, ...), provided by the `silverpeas-run` image.

The configuration of Silverpeas is in `docker/config.properties` (database, SMTP, ...) and in
`docker/CustomerSettings.xml` (customization of the settings).

### Rebuilding the indexes

When the dump changes, or when a new version of Silverpeas changes the format of the indexes,
rebuild them:

```shell
./scripts/rebuild-index.sh docker/dataset/index
```

The script starts a temporary environment (on the ports 8390, 5315 and 8335) from the dump without
any index, asks Silverpeas to reindex the whole platform from its back office
(`scripts/reindex-platform.mjs`), copies the indexes into the given directory and then removes the
temporary environment. The environment of the tests isn't touched. The indexes of another dataset
can be rebuilt by giving its dump:

```shell
./scripts/rebuild-index.sh <output directory> <database dump>
```

## Users of the tests

Each role is played by a pool of users of the dataset, one user per parallel worker, so that a same
user is never signed in by two tests at the same time (see `support/users.ts`):

| Role        | Users                                                       | Rights                                   |
|-------------|-------------------------------------------------------------|------------------------------------------|
| `admin`     | `SilverAdmin` (domain Silverpeas)                           | administrator of the platform            |
| `publisher` | `cvaldor`, `sorvane`, `tlambrec`, `mquentel`, `npeyrelle` (domain Silverpeas) | group Publieurs: publishers in the Kmelia of the Espace Collaboratif |
| `writer`    | `jdoo1`, `jdoo10`, `jdoo11`, `jdoo100`, `jdoo101` (domain Snowpeas) | group Rédacteurs                 |
| `user`      | `jdoo3` … `jdoo7` (domain Snowpeas)                         | group Lecteurs: simple readers           |

Hence, at most 5 workers can be used (3 by default, 2 on a CI server).

## Running the tests

```shell
npm test                                  # all the tests
npm run test:smoke                        # only the smoke tests
npx playwright test --grep @bug15549      # the tests of a given bug
npm run test:ui                           # interactive mode
npm run report                            # HTML report of the last run
```

The URL of the Silverpeas under test can be changed with `SILVERPEAS_URL` (by default
`http://localhost:${HTTP_PORT:-8380}`). Before running the tests, a global setup checks Silverpeas
is up and the administrator can sign in.

In case of failure, the screenshot, the video and the Playwright trace of the test are kept in
`test-results/` (`npx playwright show-trace <trace.zip>`).

### The current tests

| File                                         | What is tested                                         |
|----------------------------------------------|--------------------------------------------------------|
| `tests/smoke/authentication.spec.ts`         | sign in, wrong password, anonymous access              |
| `tests/smoke/navigation.spec.ts`             | home page, opening an application of a space, sign out |
| `tests/smoke/search.spec.ts`                 | search of a publication of the dataset                 |
| `tests/features/kmelia/publication.spec.ts`  | publication with an attachment consulted by a reader, draft not visible by the readers, search of a new publication, notification of a user by email |

## Fixing a bug with a test

Each bug is covered by a test in `tests/bugs/`, tagged with the ticket number: written first to
reproduce the bug (it fails), it then validates the fix (it passes) and stays as a non-regression
test. See [tests/bugs/README.md](tests/bugs/README.md) for the workflow and a template.

## Writing tests

* Import `test` and `expect` from `support/fixtures`:
  * `page` is signed in as a simple reader (`test.use({ signedInAs: 'publisher' })` to change the
    role, `null` for an anonymous page), `adminPage`, `publisherPage` and `writerPage` are signed
    in with the corresponding role, each in its own browser context;
  * `accounts` gives the users playing each role in the test;
  * `uniqueName` and `uniqueWord` give names unique to the test for the data it creates;
  * `mailpit` checks the emails sent by Silverpeas.
* Encapsulate the interactions with a Silverpeas page into a page object in `support/pages/`
  (`LoginPage`, `PortalPage`, `KmeliaPage`, `PublicationPage`, ...).
* A test must not depend on another one nor on the order of execution: it creates its own data
  with unique names. The environment isn't reset between two runs.
* Prefer the locators by role, label or text, then by stable identifiers.

Some specificities of Silverpeas to take into account:

* Each page signs in with its own session: Silverpeas binds a security token to the session, so a
  session can't be shared between tests running in parallel.
* The applications can be accessed directly by their router (e.g. `/silverpeas/Rkmelia/kmelia1/Main`)
  or within the portal, where the content part is the `#MyMain` iframe (see `PortalPage`).
* The tests run with a window of 1280 px wide: the navigation panel of the spaces is then hidden
  and the applications of a space are in a sub-menu of the main menu.
* The indexation and the sending of the notifications are asynchronous: poll for the expected
  result (`expect(...).toPass()`, `mailpit.waitFor()`).

## Layout

```
docker/            the test environment (Docker Compose) and its dataset (dataset/)
scripts/           scripts to manage the test environment and to rebuild the indexes
support/           test support: users, fixtures, global setup, Mailpit client, page objects (pages/)
tests/smoke/       smoke tests (tag @smoke)
tests/features/    tests per Silverpeas application (tag @smoke for the essential ones)
tests/bugs/        a test per bug (tag @bug<ticket>), see tests/bugs/README.md
```
