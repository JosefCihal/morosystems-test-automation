# MoroSystems – Automation Tester Test Case

Automated GUI and API tests for the MoroSystems _Automation Tester_ test case, written in [Playwright](https://playwright.dev) and TypeScript.

- **GUI:** Google search → MoroSystems website → _Kariéra_ page → filtering open positions by city
- **API:** CRUD operations of the [MoroSystems todo backend](https://github.com/morosystems/todo-be)

## Getting started

Prerequisites: Node.js 22.18 or newer and Git. CI uses the Node.js 24 of the Playwright image, `.nvmrc` matches it.

```bash
npm ci                    # install dependencies
npx playwright install    # download Chromium, Firefox and WebKit (on Linux add --with-deps)
npm test                  # API tests + GUI tests in all three browsers
npm run report            # open the HTML report
```

**Two API tests fail on purpose:** they found the backend defects [F-03 and F-04](#findings). They keep failing until the defects are fixed in the backend and the pinned backend commit is updated. The Google journey may be skipped because of a CAPTCHA (see [Test coverage](#test-coverage)); all other tests pass.

The backend under test is cloned into `.backend/` on the first run – at the tested commit pinned in `scripts/setup-backend.mjs`, which the OpenAPI snapshot belongs to – and started automatically by Playwright (`webServer` in `playwright.config.ts`). The backend always listens on port 8080. Locally, whatever already answers there is reused – also an outdated or modified backend, so stop it when in doubt; in CI the port must be free. URLs can be overridden with environment variables or a local `.env` file (see `.env.example`). Another `API_BASE_URL` works only locally, against a backend that is already running: with `CI` set, Playwright never reuses a running server (it fails if the URL already answers) and can start only the local backend on port 8080, so the default must be kept there.

| Command                                 | Description                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm test`                              | API tests and GUI tests in Chromium, Firefox and WebKit                                 |
| `npm run test:api`                      | API tests only                                                                          |
| `npm run test:ui`                       | GUI tests only                                                                          |
| `npm run test:visual`                   | Visual regression tests (see [Visual tests](#visual-tests))                             |
| `npm run test:visual:update`            | Update the visual baselines after an intended UI change                                 |
| `npm run report`                        | Open the last HTML report                                                               |
| `npm run backend:start`                 | Start the backend manually on http://localhost:8080                                     |
| `npm run api:generate`                  | Download the OpenAPI document from the running backend and regenerate the API connector |
| `npm run lint` / `format` / `typecheck` | ESLint / Prettier / TypeScript                                                          |

Playwright options work as usual, e.g. `npx playwright test --project=firefox --headed` or `npx playwright test --ui`.

### When a browser does not start

Playwright's browser builds may lag behind a new OS release. Set `FIREFOX_CHANNEL=moz-firefox` in `.env` to run the `firefox` project in the Firefox installed on your machine (driven through WebDriver BiDi, experimental in Playwright), or run the tests in the official Playwright image used by CI – its tag must match the `@playwright/test` version:

```bash
docker run --rm --ipc=host -e CI=true -e FIREFOX_CHANNEL= -v "$PWD":/work -v /work/node_modules -v /work/.backend -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -c "npm ci && npm test"
```

On a Linux host, the files the container writes into the project (report, test results, saved browser state) are owned by root.

## Project structure

```text
├── .github/workflows/tests.yml        CI pipeline
├── openapi/todo-api.json              snapshot of the backend's OpenAPI document (the API contract)
├── scripts/                           backend installation, OpenAPI download
├── src/
│   ├── api/                           adapter that sends API requests through Playwright's request context
│   │   └── todo/                      todo backend: generated API connector, test data
│   ├── config/                        URLs, path of the saved browser state
│   ├── fixtures/                      Playwright fixtures (API client, page objects, test data cleanup)
│   ├── reporters/                     results table for the GitHub Actions job summary
│   └── ui/                            page objects (*.page.ts) and page components (*.component.ts)
│       ├── google/                    Google search and results, consent screen
│       └── morosystems/               MoroSystems website: pages, navigation, cookie banner, expected filter results
├── tests/
│   ├── api/
│   │   └── todo/                      API tests of the todo backend, one file per operation
│   ├── setup/                         cookie consent, given once before the GUI tests
│   ├── ui/                            GUI tests (all browsers)
│   │   ├── google/                    the GUI test case: Google search → MoroSystems → Kariéra
│   │   └── morosystems/               tests of the MoroSystems website (city filter, responsive layout)
│   └── visual/                        visual regression tests of the MoroSystems website and their baselines
└── playwright.config.ts               projects, reporters, backend start
```

## Test coverage

| Assignment                      | Implementation                                                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GUI test case, steps 1–7        | `tests/ui/google/search-to-career.spec.ts` – a `test.step` per step (1 and 2 together); step 5 clicks exactly the result named in the test case; city Brno                                                                                           |
| API test case, step 1           | The backend is installed and started by Playwright (`webServer`)                                                                                                                                                                                     |
| API test case, steps 2–5        | `tests/api/todo/` – `list-tasks`, `create-task`, `update-task` and `delete-task` specs; the API updates tasks via `POST /tasks/{id}`, not PUT ([F-01](#findings))                                                                                    |
| Validate search results content | The end-to-end test checks that the result named in the test case is listed – as an organic result, not an ad – and leads to `www.morosystems.cz`                                                                                                    |
| Validate API responses          | Status codes and response bodies – exact for tasks and for the 422 and 404 error messages; every change is read back, see [Test design](#test-design)                                                                                                |
| Cross-browser testing           | Projects `chromium`, `firefox` and `webkit` – Playwright's builds of the engines of Chrome and Edge, Firefox and Safari, not the branded browsers; `FIREFOX_CHANNEL` can switch `firefox` to the installed Firefox                                   |
| Responsive design check         | `tests/ui/morosystems/responsive-layout.spec.ts` – phone width (375 px) and the narrowest width of both wider navigation layouts (1000 and 1480 px); key elements and their visible content must lie within the viewport width                       |
| Reporting                       | HTML report with steps; screenshot, video and trace (including console and network logs) on failure; in GitHub Actions also a results table on the run page – counts per project, duration, failed, flaky and skipped tests with the error or reason |
| Parallel execution              | `fullyParallel: true` – tests are independent and create their own data                                                                                                                                                                              |
| Visual testing                  | `tests/visual/visual-regression.spec.ts`                                                                                                                                                                                                             |
| OpenAPI codegen                 | `npm run api:generate` generates the API connector – one typed function per endpoint – with [Hey API](https://heyapi.dev)                                                                                                                            |
| CI/CD                           | GitHub Actions, see [CI](#ci)                                                                                                                                                                                                                        |

**Implemented vs. executed.** Google often answers automated browsers with a CAPTCHA – on CI runners practically always. In a headless run, the end-to-end test then ends as _skipped_ with the reason in the report, never as passed, so a green run without it does not verify the Google part. To run the complete scenario anyway, run it headed – the test waits up to two minutes for you to solve the CAPTCHA:

```bash
npx playwright test tests/ui/google --project=chromium --headed
```

The website part of the scenario is also covered by tests that do not depend on Google: the city filter in `tests/ui/morosystems/career-position-filter.spec.ts` and the navigation to _Kariéra_ in `tests/ui/morosystems/responsive-layout.spec.ts`.

## Test design

The tests are designed with test design techniques (ISTQB terms) and check behaviour and data, not just status codes:

| Technique                | Applied to                                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equivalence partitioning | Invalid `text`: missing, empty, `null` (422) and of a wrong type ([F-03](#findings)); every city filter option is mapped on its own, so all six are tested, and a test makes sure no other option has appeared |
| Boundary value analysis  | Each wider navigation layout is tested at its narrowest width, right above its breakpoint                                                                                                                      |
| State transition testing | Created → updated and created → deleted; a deleted task is no longer listed and can no longer be updated                                                                                                       |
| Use case testing         | The end-to-end journey from the Google search to filtered open positions                                                                                                                                       |
| Error guessing           | Attributes only the server may set (`id`, `completed`, `createdDate`) are ignored; malformed JSON does not reveal a stack trace ([F-04](#findings))                                                            |

Expected results come from the test basis where it is specific: the test case and the OpenAPI contract (attributes and their types, `text` is required, 422 for an invalid one). Where the contract says nothing or contradicts the API – the error messages, the status for an unknown task (undocumented for `POST /tasks/{id}`, documented as 400 for `DELETE`, [F-02](#findings)), rejecting an empty text – the tests expect the behaviour observed at the tested commit, and the open questions below list it for clarification. Where the expectation is clear but the exact status is not specified, any correct one is accepted: a client error for malformed JSON, 404 or 405 for the unsupported PUT. Every change is read back from the task list.

The expected filter result is derived from the visible unfiltered list, so both missing and extra positions are caught – whichever positions are open at the moment. Preconditions make sure the oracle is usable: every position must have a title and a location; a filter that does nothing is caught by the cities that narrow the list. The responsive tests are a smoke check of the layout – the navigation works and key elements and their visible content lie within the viewport width (the site clips overflowing content instead of letting the page scroll) – not a proof that the whole layout is correct.

**Not tested on purpose:** the "suitable for graduates" checkbox of the career page – positions show nothing from which the expected result could be derived and none is currently marked for graduates – and the `completed`, `complete` and `incomplete` endpoints, which are not part of the test case.

**Open questions on the test basis:** the contract defines no maximum length of `text` (so there is no upper boundary to test) and no minimum one – the tests expect an empty text to be rejected with 422, as the API does. It also does not say whether a text of spaces only is valid (the API accepts it), what happens to attributes that only the server may set (the tests expect them to be ignored), what the error messages are, or what an unknown task ID returns (the tests expect the API's plain string messages, sent as `text/html`, and 404, see [F-02](#findings)).

## Design decisions

- **Page objects and fixtures.** Page objects hold locators and user actions and contain no assertions. Fixtures inject them and the API client, so the tests never construct page objects or clients and never clean up their data themselves.
- **Locators.** Role-based locators with accessible names first. CSS selectors only where a role-based locator is unavailable or depends on the language: on Google the search field, results container, organic results (links with a heading outside the ad regions) and CAPTCHA form; on the website the cookie banner container, the positions section (`#pozice`), the position details, the filter toolbar and the custom city drop-down ([F-07](#findings)), and the footer images the visual test waits for.
- **Cookie consent.** The website's cookie banner appears asynchronously and would interrupt interactions such as hover menus. The `setup` project gives consent once and the browser projects reuse the saved `storageState`. CookieScript shows the banner only in some regions – the US-hosted GitHub runners get none – so there the consent is skipped with the reason in the report and only the state is saved. Google's consent screen depends on the region, so it is dismissed by `page.addLocatorHandler` whenever it shows up.
- **Google results vary.** Ads, the AI overview and location change the result page, and Google does not always list the result named in the test case. The test still clicks only that result; if it is missing, the test fails at the step that validates its presence. Ads are excluded – they are paid placements, and every click on one is charged to the advertiser.
- **Test data isolation.** API tests create their own data with unique `[autotest]` names. A fixture deletes it after each test, even a failed one, and fails the test if a deletion does not succeed.
- **API contract.** `openapi/todo-api.json` is a versioned snapshot of the backend's OpenAPI document and the API connector in `src/api/todo/generated/` is generated from it. After a contract change (`npm run api:generate`), incompatible usages show up as compile errors. The generated types are not checked at runtime – the tests assert status codes and response bodies. A small adapter (`src/api/playwright-fetch.ts`) sends the connector's requests through Playwright's `APIRequestContext`, so they appear as steps in the report and in the trace.
- **Found defects fail.** A test that found a defect in the behaviour (F-03, F-04) is left failing, with an annotation pointing to the finding, so the report and CI show at first glance what is broken. Findings in the documentation (F-01, F-02) are annotated on passing tests.
- **Stability.** Web-first assertions and auto-waiting, no fixed waits; GUI tests are retried in CI only – except the Google journey, as repeated searches provoke a CAPTCHA – and API tests never, as the local backend is deterministic.

## Visual tests

Screenshots of stable parts of the website (career filter toolbar, footer) are compared with baselines with Playwright's default tolerance: no pixel may differ beyond the default colour threshold. Repeated runs in the same environment produce identical screenshots, so there is no need for more. The sticky header, the cookie banner and its badge are hidden by `tests/visual/screenshot.css`, the copyright year is masked.

Screenshots differ between operating systems, so there are two sets of baselines: macOS for local runs and Linux for CI. The macOS baselines come from a single machine, and another macOS version may render fonts slightly differently. If they fail there without a visible change, or on Windows or a Linux desktop, run the visual tests in the Playwright image – the command below without `--update-snapshots`. After an intended UI change, update the macOS baselines with `npm run test:visual:update` and the Linux ones in the Playwright image (CI runners are x86-64, hence the platform):

```bash
docker run --rm --platform linux/amd64 --ipc=host -v "$PWD":/work -v /work/node_modules -v /work/.backend -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -c "npm ci && npx playwright test --project=visual --update-snapshots"
```

## CI

The GitHub Actions workflow runs on every push to `main`, on pull requests and on demand. Only users with write access can start it in this repository; anyone else can fork the repository, enable Actions in the fork and run _Tests_ from its Actions tab. A single job in the Playwright Docker image runs ESLint, Prettier and the type check, then all tests including the visual ones. A custom reporter (`src/reporters/job-summary.reporter.ts`) writes a results table to the job summary on the run page, and the HTML report is uploaded as an artifact.

Every run starts the backend from a fresh clone, so it always begins with the same three seed tasks of the backend repository. The tests create and delete their own tasks and do not depend on the seed data.

## Findings

Defects and observations found while testing. Severity is my assessment; the priority is for the product owner to decide.

| ID   | Area                  | Severity | Expected                                                                                          | Actual                                                                                                                                                                                                                                                                                                                                                | Evidence                                                                                                           |
| ---- | --------------------- | -------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| F-01 | Test case vs. API     | Info     | Step 4 updates a task with PUT                                                                    | The API has no PUT (404); tasks are updated via `POST /tasks/{id}`                                                                                                                                                                                                                                                                                    | PUT test in `update-task.spec.ts`                                                                                  |
| F-02 | API documentation     | Low      | The documentation matches the API: status for an unknown task ID, response bodies and media types | Swagger documents `400` for `DELETE /tasks/{id}`, `/complete` and `/incomplete` (the latter two not tested, see the source code) and nothing for `POST /tasks/{id}`; the API returns `404`, the correct status. Errors are documented as JSON, but sent as `text/html`; a successful `DELETE` is documented with a JSON string, but has an empty body | 404 tests in `delete-task.spec.ts` and `update-task.spec.ts`; response headers and the backend source for the rest |
| F-03 | API validation        | Medium   | A `text` attribute that is not a string (e.g. a number) is rejected with 422                      | Such a task is accepted and stored: `{"text": 123}` creates a task with a number as its text, which violates the contract (`text: string`). The source code of `POST /tasks/{id}` has the same check                                                                                                                                                  | Failing test in `create-task.spec.ts`                                                                              |
| F-04 | API security          | Low      | Malformed JSON gets a client error (400) with a neutral message                                   | 400 with an HTML stack trace including absolute server paths (information disclosure) – Express' default error handler outside production mode                                                                                                                                                                                                        | Failing test in `create-task.spec.ts`                                                                              |
| F-05 | Website               | Low      | The cookie banner appears on the first visit                                                      | It appears only after a request to `crossdomain.cookie-script.com` answers; when it does not, there is no banner at all                                                                                                                                                                                                                               | Observed in a trace; the consent setup reloads the page                                                            |
| F-06 | Website UX            | Low      | An empty filter result tells the visitor there is no matching position                            | An empty list without any message (currently Bratislava and home office)                                                                                                                                                                                                                                                                              | Observed while running the city filter tests                                                                       |
| F-07 | Website accessibility | Low      | The city filter is announced as a drop-down (`combobox`/`listbox`, `aria-expanded`)               | A link with styled radio buttons without these semantics                                                                                                                                                                                                                                                                                              | Accessibility tree of the career page                                                                              |

## Possible next steps

- Accessibility checks with `@axe-core/playwright` (would catch F-07 automatically).
- Run the website tests against a dedicated test environment; the Google journey stays a smoke test of the real search.
- Reset the backend data before each test run.
- Start the backend only for API runs – Playwright's `webServer` is global, so GUI-only runs start it too.
