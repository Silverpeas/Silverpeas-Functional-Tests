# Tests of bugs

Each bug of the Redmine tracker (https://tracker.silverpeas.org) is covered by one test file named
after the ticket number and a short title: `<ticket>-<short-title>.spec.ts`, for example
`15549-publication-copy-loses-attachments.spec.ts`.

The tests are tagged with the ticket number (`@bug<ticket>`), so that they can be run alone:

```shell
npx playwright test --grep @bug15549
```

## Workflow

1. Write the test describing the **expected** behaviour, from the steps to reproduce of the ticket.
2. Run it against the current version of Silverpeas (not fixed): it **must fail**, which proves the
   bug is reproduced. If the test has to be committed before the fix, mark it with `test.fail()`
   and the ticket number in the annotation.
3. Fix the bug in the Silverpeas projects, build them (`mvn install`), and redeploy them into the
   environment: `./scripts/env-redeploy.sh`.
4. Run the test again: it **must pass**. Remove the `test.fail()` mark if any.
5. The test stays in the suite as a non-regression test.

## Template

```ts
import { expect, test } from '../../support/fixtures';

test.describe('Bug #15549: <title of the ticket>', {
  tag: '@bug15549',
  annotation: { type: 'issue', description: 'https://tracker.silverpeas.org/issues/15549' },
}, () => {

  test('<expected behaviour>', async ({ page, uniqueName }) => {
    // Given ...
    // When ...
    // Then ...
  });
});
```
