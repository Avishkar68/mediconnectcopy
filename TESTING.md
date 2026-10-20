# Testing

Run commands from the indicated application directory. The test runners print each case and a pass/fail summary in the terminal.

## Backend

From `backend`:

```powershell
npm run test:functional
npm run test:nonfunctional
npm test
```

Functional tests exercise authentication validation and role authorization. Nonfunctional tests check repeated-response consistency and controller validation latency. The latency check runs controller code in-process; it is not a live-server or database load test.

## Frontend

From `frontend`:

```powershell
npm run test:functional
npm run test:nonfunctional
npm test
```

Functional tests cover login, registration, buttons, inputs, and Axios response/error handling. Nonfunctional tests run axe accessibility checks on the login and registration pages and check React render durations against a 500ms budget. The jsdom accessibility checks disable color-contrast analysis; verify contrast in a browser-based audit for full coverage.

## AI service

From `ai-service`:

```powershell
python -m pytest -v tests
```

These API tests invoke FastAPI in-process and mock local LLM calls; they do not require the llama.cpp service. Install dependencies with `python -m pip install -r requirements.txt`.

## Execution report

From the repository root, after capturing the test logs in `test-report-evidence/logs`:

```powershell
python -m pip install -r scripts/report-requirements.txt
python scripts/generate_test_report.py
```

The report generator reads captured raw test logs, creates one Chromium screenshot per executed case from the exact runner-output excerpt, and writes `TEST_CASES_EXECUTION_REPORT.pdf`. These evidence images show captured test output—not live browser UI or terminal screenshots. MongoDB, Cloudinary, Gemini, and live local-LLM integration cases require a controlled environment and were not part of this execution.
