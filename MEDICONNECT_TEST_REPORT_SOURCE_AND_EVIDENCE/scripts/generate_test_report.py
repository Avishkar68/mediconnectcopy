from __future__ import annotations

import html
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "test-report-evidence"
LOGS = EVIDENCE / "logs"
SCREENSHOTS = EVIDENCE / "screenshots"
REPORT = ROOT / "TEST_CASES_EXECUTION_REPORT.pdf"
IST = ZoneInfo("Asia/Kolkata")

NAVY = colors.HexColor("#14365D")
BLUE = colors.HexColor("#1E5A8A")
PALE_BLUE = colors.HexColor("#DCE7F4")
ROW_BLUE = colors.HexColor("#EEF3F9")
INK = colors.HexColor("#172B40")
MUTED = colors.HexColor("#536579")
GREEN = colors.HexColor("#18794E")
RED = colors.HexColor("#B42318")
AMBER = colors.HexColor("#9A6700")
WHITE = colors.white


@dataclass
class Case:
    case_id: str
    service: str
    category: str
    module: str
    name: str
    source: str
    command: str
    raw_line: str
    status: str
    elapsed: str = ""
    measurement: str = ""
    details: str = ""
    test_input: str = ""
    evidence_path: Path | None = None
    evidence_note: str = ""


def read_log(name: str) -> str:
    path = LOGS / name
    data = path.read_bytes()
    encoding = "utf-16" if data.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig"
    return data.decode(encoding, errors="replace")


def module_from_frontend(source: str, suite: str) -> str:
    if "Login" in source or "Login page" in suite:
        return "Authentication / Login"
    if "Register" in source or "Register page" in suite:
        return "Authentication / Registration"
    if "api.test" in source:
        return "Axios API client"
    if "Input" in source:
        return "Shared form input"
    if "Button" in source:
        return "Shared action button"
    return "Frontend quality"


def front_input(name: str, module: str) -> str:
    lower = name.lower()
    if "malformed email address" in lower:
        return f"Email value: {name.rsplit(' ', 1)[-1]!r}; other fields use valid test values."
    if "whitespace-only email" in lower:
        return "Email: spaces only; password: secret123."
    if "whitespace-only name" in lower:
        return "Name: spaces only; valid email and a password longer than five characters."
    if "password shorter" in lower:
        return "Name and email valid; password has five characters."
    if "selected doctor role" in lower:
        return "Synthetic doctor name/email, password secret123, selected role doctor."
    if "selected admin role" in lower:
        return "Synthetic admin name/email, password secret123, selected role admin."
    if "plus signs" in lower or "plus tags" in lower:
        return "Email: patient+care@example.com; password: secret123."
    if "backend error" in lower or "login fails" in lower:
        return "Valid-shaped email/password; mocked auth action rejects with an error."
    if "login" in module.lower() or "register" in module.lower():
        return "Synthetic form values in the test source; auth context is mocked."
    if "api" in module.lower():
        return "Synthetic Axios adapter response/error; no network request is sent."
    if "input" in module.lower():
        return "Synthetic label, input type, placeholder, value, and event handler."
    if "button" in module.lower():
        return "Synthetic button children, variant, disabled/loading props, and click callback."
    return "Synthetic values defined by this test; no production or patient data."


def parse_frontend() -> list[Case]:
    cases: list[Case] = []
    pattern = re.compile(r"^\s*\u2713\s+(.+?)\s+([\d.]+ms)$")
    for line in read_log("frontend-tests.log").splitlines():
        match = pattern.match(line)
        if not match or "src/" not in match.group(1):
            continue
        evidence_line, elapsed = match.groups()
        parts = evidence_line.split(" > ")
        source = parts[0].strip()
        suite = parts[-2].strip() if len(parts) > 2 else "Frontend"
        name = parts[-1].strip()
        category = (
            "Non-functional"
            if "src/nonfunctional/" in source
            else "Functional"
        )
        module = module_from_frontend(source, suite)
        cases.append(
            Case(
                case_id=f"FE-{'NF' if category == 'Non-functional' else 'F'}-{len(cases) + 1:03}",
                service="Frontend",
                category=category,
                module=module,
                name=name,
                source=source.replace("/", "\\"),
                command="cd frontend; npm test",
                raw_line=line.strip(),
                status="PASSED",
                elapsed=elapsed,
                measurement=measurement_for(name),
                details=(
                    "Rendered/exercised with Vitest, React Testing Library, jsdom, and "
                    "MemoryRouter where relevant. Authentication actions or Axios adapters "
                    "are mocked in these component/service tests; this is not a live backend "
                    "integration run."
                ),
                test_input=front_input(name, module),
            )
        )
    if len(cases) != 55:
        raise RuntimeError(f"Expected 55 frontend cases in captured run; parsed {len(cases)}.")

    functional_number = 0
    nonfunctional_number = 0
    for case in cases:
        if case.category == "Functional":
            functional_number += 1
            case.case_id = f"FE-F-{functional_number:03}"
        else:
            nonfunctional_number += 1
            case.case_id = f"FE-NF-{nonfunctional_number:03}"
    return cases


def measurement_for(name: str) -> str:
    logs = read_log("frontend-tests.log")
    mapping = {
        "Login page axe": r"\[MEASURE\] Login page axe violations: [^\r\n]+",
        "Registration page axe": r"\[MEASURE\] Registration page axe violations: [^\r\n]+",
        "Login React render": r"\[MEASURE\] Login React render max: [^\r\n]+",
        "Button React render": r"\[MEASURE\] Button React render max: [^\r\n]+",
    }
    for key, pattern in mapping.items():
        if key.lower() in name.lower():
            match = re.search(pattern, logs)
            return match.group(0) if match else ""
    return ""


def backend_input(name: str) -> str:
    lower = name.lower()
    if "omitted" in lower:
        missing = name.removeprefix("rejects registration when ").replace(" omitted", "")
        return f"Registration body omits: {missing}; remaining required fields use valid synthetic values."
    if "below minimum length" in lower:
        return f"Registration password is the boundary value embedded in the case name: {name.split('password ', 1)[-1]}."
    if "unsupported registration role" in lower:
        return f"Registration role is the unsupported value embedded in the case name: {name.rsplit(' ', 1)[-1]}."
    if "verification fields" in lower or "login credentials" in lower:
        return f"Request body: {name[name.find('{'):] if '{' in name else 'one or more required fields are missing'}."
    if "allows " in lower and " access" in lower:
        return "Synthetic user role and permitted role list are stated in the test name."
    if "denies role access" in lower:
        return "Synthetic user role and permitted role list are stated in the test name; includes missing-user case."
    if "protected request" in lower:
        return f"JWT/cookie/header scenario: {name.removeprefix('rejects protected request with ')}."
    if "logout" in lower or "cookie" in lower:
        return "Mock response object; no browser cookie jar or external service."
    return "Synthetic Express controller/middleware request body defined in the test source."


def parse_backend() -> list[Case]:
    cases: list[Case] = []
    current_suite = ""
    pattern = re.compile(r"^\s{2,}\u2714 (.+?) \(([\d.]+ms)\)$")
    for line in read_log("backend-tests.log").splitlines():
        suite_match = re.match(r"^▶ (.+)$", line)
        if suite_match:
            current_suite = suite_match.group(1)
            continue
        match = pattern.match(line)
        if not match:
            continue
        name, elapsed = match.groups()
        category = "Non-functional" if current_suite == "Backend nonfunctional checks" else "Functional"
        cases.append(
            Case(
                case_id="",
                service="Backend",
                category=category,
                module=(
                    "Backend reliability/performance"
                    if category == "Non-functional"
                    else current_suite
                ),
                name=name,
                source=(
                    "backend\\test\\nonfunctional.test.js"
                    if category == "Non-functional"
                    else "backend\\test\\auth.test.js"
                ),
                command="cd backend; npm test",
                raw_line=line.strip(),
                status="PASSED",
                elapsed=elapsed,
                measurement=(
                    re.search(
                        r"\[MEASURE\] Registration validation p95[^\r\n]+",
                        read_log("backend-tests.log"),
                    ).group(0)
                    if "p95" in name
                    else ""
                ),
                details=(
                    "Calls the actual Node.js controller or middleware function with "
                    "synthetic requests and a mocked Express response. No HTTP server, "
                    "MongoDB query, or persisted record is involved."
                ),
                test_input=backend_input(name),
            )
        )
    if len(cases) != 55:
        raise RuntimeError(f"Expected 55 backend cases in captured run; parsed {len(cases)}.")

    functional_number = 0
    nonfunctional_number = 0
    for case in cases:
        if case.category == "Functional":
            functional_number += 1
            case.case_id = f"BE-F-{functional_number:03}"
        else:
            nonfunctional_number += 1
            case.case_id = f"BE-NF-{nonfunctional_number:03}"
    return cases


def parse_ai_service() -> list[Case]:
    cases: list[Case] = []
    for line in read_log("ai-service-tests.log").splitlines():
        match = re.match(r"^(tests/test_api\.py::)(\w+)\s+PASSED\b", line)
        if not match:
            continue
        name = match.group(2).removeprefix("test_").replace("_", " ")
        cases.append(
            Case(
                case_id=f"AI-F-{len(cases) + 1:03}",
                service="AI service",
                category="Functional",
                module="FastAPI AI/report analysis API",
                name=name,
                source="ai-service\\tests\\test_api.py",
                command="cd ai-service; python -m pytest -v tests",
                raw_line=line.strip(),
                status="PASSED",
                details=(
                    "FastAPI TestClient invokes the actual ASGI route in-process. Local "
                    "LLM calls are mocked, including explicit offline tests; no external "
                    "model process or production data is accessed."
                ),
                test_input=(
                    "Synthetic prompt/report text and mocked LLM response or connection "
                    "failure as defined in ai-service/tests/test_api.py."
                ),
            )
        )
    if len(cases) != 12:
        raise RuntimeError(f"Expected 12 AI-service cases in captured run; parsed {len(cases)}.")
    return cases


def audit_cases() -> list[Case]:
    cases: list[Case] = []
    for service, filename, package_dir in (
        ("Frontend", "frontend-audit.json", "frontend"),
        ("Backend", "backend-audit.json", "backend"),
    ):
        report = json.loads(read_log(filename))
        totals = report["metadata"]["vulnerabilities"]
        vulnerabilities = report.get("vulnerabilities", {})
        package_summary = "; ".join(
            f"{name}: {detail['severity']} severity"
            for name, detail in sorted(vulnerabilities.items())
        )
        severity_summary = (
            f"{totals['critical']} critical, {totals['high']} high, "
            f"{totals['moderate']} moderate, {totals['low']} low"
        )
        cases.append(
            Case(
                case_id=f"{'FE' if service == 'Frontend' else 'BE'}-NF-SEC-01",
                service=service,
                category="Non-functional",
                module="Production dependency security audit",
                name=f"{service} npm production dependency audit",
                source=f"{package_dir}\\package-lock.json",
                command=f"cd {package_dir}; npm audit --omit=dev --json",
                raw_line=f"npm audit found {severity_summary}. Packages: {package_summary}.",
                status="FAILED" if totals["total"] else "PASSED",
                details=(
                    "npm audit checked the committed production dependency tree against "
                    "the advisory database at execution time. This is a dependency "
                    "advisory scan, not a penetration test or proof of exploitability."
                ),
                test_input="Locked production dependency graph; development dependencies excluded.",
            )
        )
    return cases


def quality_cases() -> list[Case]:
    lint_log = read_log("frontend-lint.log")
    lint_warnings = len(re.findall(r"warning eslint", lint_log))
    build_log = read_log("frontend-build.log")
    built_line = next(
        (line.strip() for line in build_log.splitlines() if "built in" in line),
        "Build completion line not found in captured output.",
    )
    return [
        Case(
            case_id="FE-NF-QA-01",
            service="Frontend",
            category="Non-functional",
            module="Static analysis / maintainability",
            name="Frontend Oxlint static analysis",
            source="frontend\\src\\ (workspace)",
            command="cd frontend; npm run lint",
            raw_line=f"Oxlint exited successfully with {lint_warnings} existing warning(s).",
            status="PASSED",
            details="Runs the repository's configured Oxlint command over the frontend source.",
            test_input="All source files included by the default Oxlint invocation.",
        ),
        Case(
            case_id="FE-NF-QA-02",
            service="Frontend",
            category="Non-functional",
            module="Build / release quality",
            name="Frontend production build",
            source="frontend\\vite.config.js",
            command="cd frontend; npm run build",
            raw_line=built_line,
            status="PASSED",
            details=(
                "Runs the configured Vite production build. Build completion is successful; "
                "the captured output also reports a JavaScript chunk larger than 500 kB."
            ),
            test_input="Complete Vite production bundle from current frontend source.",
        ),
    ]


NOT_EXECUTED = [
    ("INT-01", "Patient registration, OTP, login and logout against live Express + MongoDB", "Integration / Authentication", "No live Express/MongoDB environment was configured for this run; controller unit tests do not persist accounts.", "Run isolated test database; register user, fetch OTP via dev-only endpoint, verify, log in, call protected /me, log out; assert persisted states and cookie/token behavior."),
    ("DB-01", "Patient health profile create/read/update persistence", "Database / Patient health", "MongoDB connection and isolated test dataset were not exercised.", "Against disposable MongoDB, POST health data, GET it, update values, and verify persisted representation."),
    ("DB-02", "Medical record upload/list/delete with storage integration", "Database / Records and upload", "Requires MongoDB plus upload storage or Cloudinary credentials; neither integration was run.", "Upload an allowed test document, list record, verify metadata/storage reference, delete, and verify removal."),
    ("DB-03", "Medication and appointment CRUD persistence", "Database / Patient scheduling", "No real database-backed create/read/update/delete test executed.", "Create synthetic medication and appointment, read by patient, modify/cancel, and verify database state."),
    ("DB-04", "Doctor access consent and role-protected patient data", "Database / Authorization", "Requires persisted patient/doctor users and MongoDB relationships.", "Attempt access before consent, grant access, read permitted patient data, revoke access, then verify denial."),
    ("DB-05", "Admin user status/role changes and audit-log persistence", "Database / Administration", "Requires seeded admin and users in an isolated MongoDB database.", "Change a synthetic user's status/role and doctor verification; confirm the audit entry and updated database state."),
    ("DB-06", "Community posts, comments, and likes persistence", "Database / Community", "Post controller/model operations were not exercised by current test files.", "Create a synthetic post, read feed, comment, toggle like, and verify persistence and ownership rules."),
    ("DB-07", "Notification read/delete state persistence", "Database / Notifications", "Requires persisted notification records and a live backend.", "Create/seed notifications, mark one/all read, delete one, and verify stored state."),
    ("DB-08", "Care-plan task completion persistence", "Database / Care plans", "No live MongoDB care-plan records were available.", "Toggle a task for an authorized patient/doctor and verify state survives a subsequent read."),
    ("INT-02", "Frontend patient report analyzer through Express to FastAPI", "Integration / Report analysis", "React service tests use mocked adapters; backend report controller and network hop were not exercised.", "Start Express + FastAPI; submit UI report; verify request payload, service response, displayed metrics, and stored record."),
    ("EXT-01", "Real local LLM generation and analysis response", "External service / AI", "Local llama.cpp endpoint 127.0.0.1:8081 was mocked and was not verified live.", "Run supported model service and exercise /generate and /analyze-report using non-sensitive synthetic test text."),
    ("EXT-02", "Emergency assistant response through Gemini", "External service / Emergency assistant", "Requires Gemini credentials/network; external call was not invoked.", "Use a non-sensitive synthetic emergency scenario with a test key; verify response validation, errors, and rate/usage controls."),
    ("EXT-03", "Cloudinary upload and remote deletion", "External service / File storage", "No Cloudinary credentials or remote upload/deletion run.", "Use a dedicated test account and non-sensitive test file; verify upload URL, cleanup, and failure handling."),
    ("INT-03", "Two-peer WebRTC/Socket.IO consultation workflow", "Integration / Video consultation", "No paired browser peers, live Socket.IO server, camera/microphone, or signaling session used.", "Connect two test clients, join room, exchange offer/answer/ICE, send chat, and verify disconnect cleanup."),
    ("NF-01", "Live Express endpoint response-time and concurrent-user load test", "Non-functional / Performance", "Measured backend p95 is controller-only in-process validation (0.11ms), not HTTP/database service latency; no load harness used.", "Run isolated service and database with defined concurrency, warm-up, p95/p99 thresholds, and record CPU/memory."),
    ("NF-02", "Browser page-load and mobile/tablet responsiveness across supported browsers", "Non-functional / Compatibility", "Vitest uses jsdom; no cross-browser or multi-viewport browser matrix was executed.", "Test supported browser versions at desktop/tablet/mobile viewports and record page errors, overflow, and key journeys."),
    ("NF-03", "Keyboard-only, screen-reader, and full WCAG color-contrast audit", "Non-functional / Accessibility", "Axe checks on login/register passed but explicitly disabled color-contrast; no screen reader or keyboard-only full-flow audit was run.", "Run keyboard navigation, screen reader checks, and a browser-based WCAG contrast audit across core routes."),
    ("NF-04", "MongoDB outage recovery, data-volume scalability, and process resource usage", "Non-functional / Reliability and scalability", "No MongoDB outage, large dataset, sustained workload, or CPU/memory telemetry was available.", "Use a disposable database, inject connection loss/recovery, increase seeded data and request volume, and capture resource metrics."),
    ("SEC-01", "Dynamic injection, production configuration, secret exposure, and route authorization audit", "Non-functional / Security", "Only JWT rejection/role middleware unit checks and npm dependency audits executed; no dynamic penetration test or production secret/config review performed.", "Use an authorized staging environment; verify input handling, route controls, secret redaction, cookie flags, and security headers."),
]


def escape(value: str) -> str:
    return html.escape(str(value), quote=True).replace("\n", "<br/>")


def make_output_html(case: Case, output_file: Path) -> None:
    status_class = "pass" if case.status == "PASSED" else "fail" if case.status == "FAILED" else "pending"
    screenshot_content = html.escape(case.raw_line)
    measurement = (
        f'<div class="measure">{html.escape(case.measurement)}</div>'
        if case.measurement
        else ""
    )
    page = f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
* {{ box-sizing: border-box; }}
body {{ margin: 0; width: 1280px; height: 245px; padding: 18px 22px; background: #101923; color: #d9e2ec; font: 15px/1.5 Consolas, "Courier New", monospace; overflow: hidden; }}
.top {{ display: flex; align-items: center; gap: 18px; border-bottom: 1px solid #334155; padding-bottom: 9px; }}
.id {{ color: #93c5fd; font-weight: 700; }}
.pass {{ color: #86efac; font-weight: 700; }}
.fail {{ color: #fca5a5; font-weight: 700; }}
.pending {{ color: #fcd34d; font-weight: 700; }}
.label {{ color: #94a3b8; font-size: 12px; margin-left: auto; }}
.name {{ margin: 10px 0 5px; color: #f8fafc; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.raw {{ margin: 0; padding: 8px 10px; height: 68px; white-space: pre-wrap; overflow-wrap: anywhere; background: #182534; border-left: 3px solid #38bdf8; color: #e2e8f0; }}
.measure {{ color: #fbbf24; padding-top: 5px; white-space: nowrap; }}
.source {{ color: #94a3b8; font-size: 11px; padding-top: 5px; }}
</style></head><body>
<div class="top"><span class="id">{html.escape(case.case_id)}</span>
<span class="{status_class}">{html.escape(case.status)}</span>
<span>{html.escape(case.service)} / {html.escape(case.module)}</span>
<span class="label">CAPTURED RUNNER OUTPUT</span></div>
<div class="name">{html.escape(case.name)}</div>
<pre class="raw">{screenshot_content}</pre>{measurement}
<div class="source">{html.escape(case.command)} | {html.escape(case.source)}</div>
</body></html>"""
    output_file.write_text(page, encoding="utf-8")


def chrome_executable() -> Path:
    configured = os.environ.get("CHROME_PATH")
    options = [
        Path(configured) if configured else None,
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    ]
    for option in options:
        if option and option.is_file():
            return option
    raise RuntimeError(
        "A Chromium browser is required to capture evidence PNGs. Set CHROME_PATH."
    )


def capture_screenshot(case: Case, html_file: Path, profile: Path) -> None:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    shot = SCREENSHOTS / f"{case.case_id}.png"
    shot.unlink(missing_ok=True)
    command = [
        str(chrome_executable()),
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        f"--user-data-dir={profile}",
        "--window-size=1280,245",
        f"--screenshot={shot}",
        html_file.resolve().as_uri(),
    ]
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if result.returncode != 0 or not shot.is_file() or shot.stat().st_size < 1000:
        raise RuntimeError(
            f"Screenshot capture failed for {case.case_id}: "
            f"{result.stderr[-1000:] or result.stdout[-1000:]}"
        )
    case.evidence_path = shot
    case.evidence_note = (
        "Chromium screenshot of a local evidence page containing the exact captured "
        "runner/audit output excerpt shown in the adjacent raw evidence log."
    )


def add_case_screenshots(cases: list[Case]) -> None:
    with tempfile.TemporaryDirectory(prefix="mediconnect-evidence-") as temporary:
        temp_path = Path(temporary)
        profile = temp_path / "browser-profile"
        for case in cases:
            html_file = temp_path / f"{case.case_id}.html"
            make_output_html(case, html_file)
            capture_screenshot(case, html_file, profile)


def not_executed_cases() -> list[Case]:
    cases = []
    for case_id, name, module, reason, steps in NOT_EXECUTED:
        cases.append(
            Case(
                case_id=case_id,
                service="Cross-service / Environment",
                category="Not executed",
                module=module,
                name=name,
                source="Not in executed test files",
                command="Not run",
                raw_line="NOT EXECUTED - " + reason,
                status="NOT EXECUTED",
                details=steps,
                test_input="Would use isolated synthetic records only; no real patient data.",
                evidence_note="No screenshot: this scenario was not executed.",
            )
        )
    return cases


def styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="CoverTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=33,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=18,
    ))
    base.add(ParagraphStyle(
        name="CoverSub",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=15,
        leading=21,
        textColor=BLUE,
        alignment=TA_CENTER,
        spaceAfter=10,
    ))
    base.add(ParagraphStyle(
        name="Section",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=NAVY,
        spaceBefore=4,
        spaceAfter=12,
        keepWithNext=True,
    ))
    base.add(ParagraphStyle(
        name="Subsection",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=BLUE,
        spaceBefore=8,
        spaceAfter=6,
        keepWithNext=True,
    ))
    base.add(ParagraphStyle(
        name="BodySmall",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=8.4,
        leading=11.5,
        textColor=INK,
        spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="HeaderCell",
        parent=base["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=9,
        textColor=WHITE,
    ))
    base.add(ParagraphStyle(
        name="Cell",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=7.2,
        leading=9,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        name="CellSmall",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=6.4,
        leading=8,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        name="CaseTitle",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=NAVY,
        spaceAfter=5,
    ))
    base.add(ParagraphStyle(
        name="EvidenceCaption",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=MUTED,
    ))
    return base


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(PALE_BLUE)
    canvas.setLineWidth(0.6)
    canvas.line(0.62 * inch, height - 0.48 * inch, width - 0.62 * inch, height - 0.48 * inch)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(NAVY)
    canvas.drawString(0.65 * inch, height - 0.38 * inch, "MEDICONNECT")
    canvas.setFont("Helvetica", 7.2)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 0.65 * inch, height - 0.38 * inch, "TEST CASE EXECUTION REPORT")
    canvas.setStrokeColor(PALE_BLUE)
    canvas.line(0.62 * inch, 0.48 * inch, width - 0.62 * inch, 0.48 * inch)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.65 * inch, 0.32 * inch, "MediConnect | execution evidence and coverage limits")
    canvas.drawRightString(width - 0.65 * inch, 0.32 * inch, f"Page {doc.page}")
    canvas.restoreState()


def table_style(header=True, font_size=7.5):
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C9D5E2")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [WHITE, ROW_BLUE]),
    ]
    if header:
        commands.extend([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ])
    return TableStyle(commands)


def case_expected(case: Case) -> str:
    name = case.name.lower()
    if case.status == "NOT EXECUTED":
        return "The scenario should meet its stated acceptance criteria when run in the required isolated environment."
    if case.status == "FAILED" and "audit" in case.name.lower():
        return "No known production dependency advisories should be reported by npm audit."
    if "malformed token" in name or "expired token" in name or "unknown secret" in name:
        return "Protected request is rejected with HTTP 401 and a standardized token-validation error."
    if "unauthorized" in name or "denies role" in name:
        return "Request is rejected with HTTP 403; next handler is not called."
    if "allows" in name and "access" in name:
        return "Authorized role reaches next handler exactly once."
    if "whitespace" in name or "empty" in name or "missing" in name or "omitted" in name:
        return "Validation rejects the input with the expected field-specific error or 400/422 response; no success action occurs."
    if "malformed email" in name:
        return "Form displays the email-format error and does not call the auth action."
    if "password shorter" in name or "minimum length" in name:
        return "Password boundary is rejected with validation feedback and no auth action."
    if "register" in name and ("valid" in name or "submits" in name):
        return "Registration action receives the specified synthetic values and navigation proceeds to encoded OTP verification."
    if "login" in name and ("redirect" in name or "logs in" in name):
        return "Auth action receives the expected credentials and the router navigates to the expected destination."
    if "logout" in name:
        return "Response confirms logout and clears the HTTP-only JWT cookie."
    if "axe" in name:
        return "Axe reports zero enabled-rule accessibility violations for the rendered page."
    if "render" in name or "response-time" in name or "p95" in name:
        return "Measured duration is below the explicitly asserted 500ms UI or 100ms controller threshold."
    if "dependency audit" in name:
        return "Audit reports no vulnerable production dependencies."
    if "production build" in name:
        return "Vite completes a production build successfully."
    if "static analysis" in name:
        return "Oxlint completes with no process error; warnings are separately reported."
    if case.service == "AI service":
        if "offline" in name:
            return "Service returns the documented fallback or service-unavailable response."
        if "missing" in name:
            return "FastAPI returns the expected request-validation response."
        if "whitespace" in name:
            return "FastAPI rejects blank input with HTTP 400 and a clear detail message."
        if "extracts" in name:
            return "Analysis response preserves verified value/status, metric coverage, and response schema."
        if "invalid llm schema" in name:
            return "Invalid model output is rejected with HTTP 422."
        return "Endpoint/helper returns the asserted status, response shape, and data."
    return "The behavior and response asserted by the named test are satisfied."


def case_actual(case: Case) -> str:
    if case.status == "NOT EXECUTED":
        return case.raw_line
    actual = f"Captured runner result: {case.raw_line}"
    if case.measurement:
        actual += f" Measurement: {case.measurement}"
    if case.status == "FAILED":
        actual += " This is an observed audit finding, not a test-runner assertion failure."
    return actual


def add_index(story, title: str, cases: list[Case], s, description: str = ""):
    story.append(Paragraph(title, s["Section"]))
    if description:
        story.append(paragraph(description, s["BodySmall"]))
        story.append(Spacer(1, 4))
    rows = [[
        paragraph("Test Case ID", s["HeaderCell"]),
        paragraph("Test Case Name", s["HeaderCell"]),
        paragraph("Module / short description", s["HeaderCell"]),
        paragraph("Status", s["HeaderCell"]),
    ]]
    for case in cases:
        status_style = s["Cell"]
        rows.append([
            paragraph(case.case_id, status_style),
            paragraph(case.name, status_style),
            paragraph(f"{case.module}<br/>{case.source}", s["CellSmall"]),
            paragraph(case.status, status_style),
        ])
    table = Table(rows, colWidths=[0.9 * inch, 2.25 * inch, 3.3 * inch, 0.72 * inch], repeatRows=1)
    table.setStyle(table_style())
    story.append(table)


def add_summary(story, title, rows, s):
    story.append(Paragraph(title, s["Subsection"]))
    data = [[paragraph("Category", s["HeaderCell"]), paragraph("Executed", s["HeaderCell"]), paragraph("Passed", s["HeaderCell"]), paragraph("Failed", s["HeaderCell"]), paragraph("Not executed", s["HeaderCell"])]]
    data.extend([[paragraph(str(value), s["Cell"]) for value in row] for row in rows])
    table = Table(data, colWidths=[3.0 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.9 * inch], repeatRows=1)
    table.setStyle(table_style())
    story.append(table)


def detailed_case(story, case: Case, s, ordinal: int):
    status_color = "#B42318" if case.status == "FAILED" else "#9A6700" if case.status == "NOT EXECUTED" else "#18794E"
    story.append(Paragraph(f"{case.case_id} - {escape(case.name)}", s["CaseTitle"]))
    story.append(Paragraph(
        f'<font color="{status_color}"><b>{escape(case.status)}</b></font>'
        f" &nbsp; | &nbsp; {escape(case.service)} &nbsp; | &nbsp; {escape(case.category)}",
        s["BodySmall"],
    ))
    fields = [
        ("Feature / module", case.module),
        ("Requirement / purpose", f"Verify the implemented behavior: {case.name}."),
        ("Preconditions / setup", case.details),
        ("Input / test data", case.test_input),
        ("Execution procedure", (
            f"1. Run `{case.command}`. 2. Execute the test in `{case.source}`. "
            "3. Apply the test's recorded inputs. 4. Evaluate the assertions reported by the runner."
        )),
        ("Expected result", case_expected(case)),
        ("Actual result", case_actual(case)),
        ("Execution status", case.status),
    ]
    rows = []
    for label, value in fields:
        rows.append([
            paragraph(label, s["Cell"]),
            paragraph(value, s["Cell"]),
        ])
    info = Table(rows, colWidths=[1.35 * inch, 5.85 * inch])
    info.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C9D5E2")),
        ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info)
    story.append(Spacer(1, 8))

    if case.evidence_path and case.evidence_path.is_file():
        story.append(Paragraph("Individual execution evidence", s["Subsection"]))
        img = Image(
            str(case.evidence_path),
            width=7.15 * inch,
            height=1.75 * inch,
            kind="proportional",
        )
        story.append(img)
        story.append(Paragraph(
            f"{escape(case.evidence_note)} Source log: "
            f"test-report-evidence/logs; PNG: {escape(case.evidence_path.name)}.",
            s["EvidenceCaption"],
        ))
    else:
        story.append(Paragraph(
            "Evidence screenshot: NOT AVAILABLE - this scenario was not executed. "
            "No screenshot or successful outcome has been fabricated.",
            s["EvidenceCaption"],
        ))


def build_report():
    frontend = parse_frontend()
    backend = parse_backend()
    ai_cases = parse_ai_service()
    audits = audit_cases()
    quality = quality_cases()
    executed = frontend + backend + ai_cases + audits + quality
    nonexecuted = not_executed_cases()

    if len(executed) != 126:
        raise RuntimeError(f"Expected 126 executed checks in report; got {len(executed)}.")
    if len(nonexecuted) != 19:
        raise RuntimeError(f"Expected 19 documented unexecuted scenarios; got {len(nonexecuted)}.")

    add_case_screenshots(executed)
    s = styles()
    story = []

    # Cover
    story.extend([
        Spacer(1, 1.05 * inch),
        Paragraph("MEDICONNECT", s["CoverTitle"]),
        Paragraph("Test Cases Execution Report", s["CoverSub"]),
        Spacer(1, 0.15 * inch),
        Paragraph("Frontend | Backend API | AI Analysis Service", s["CoverSub"]),
        Spacer(1, 0.35 * inch),
    ])
    cover_rows = [
        ("Project", "MediConnect - patient, doctor, administrator, and AI medical-report platform"),
        ("Architecture", "React/Vite frontend | Express/Mongoose API | FastAPI AI service"),
        ("Execution date", datetime.fromtimestamp((LOGS / "frontend-tests.log").stat().st_mtime, IST).strftime("%d %B %Y, %H:%M:%S IST")),
        ("Automated test cases", "122 executed: 122 passed, 0 failed, 0 skipped"),
        ("Additional quality checks", "2 npm audits (both returned dependency findings); frontend lint and production build completed"),
        ("Evidence", "Individual Chromium-captured evidence pages sourced from raw runner/audit outputs; raw logs are included"),
    ]
    cover_table = Table(
        [[paragraph(a, s["Cell"]), paragraph(b, s["Cell"])] for a, b in cover_rows],
        colWidths=[1.45 * inch, 5.65 * inch],
    )
    cover_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D5E2")),
        ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
        ("ROWBACKGROUNDS", (1, 0), (1, -1), [WHITE, ROW_BLUE]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(cover_table)
    story.extend([
        Spacer(1, 0.35 * inch),
        Paragraph(
            "Purpose: provide an evidence-backed account of the executed automated tests, "
            "the implemented project areas they cover, and material tests that remain unexecuted.",
            s["BodySmall"],
        ),
        PageBreak(),
    ])

    # Objectives, scope, environment
    story.append(Paragraph("1. Objectives, scope, and environment", s["Section"]))
    story.append(paragraph(
        "The report is based on source inspection of the React frontend, Express/Mongoose backend, "
        "and FastAPI AI service, plus the recorded execution logs listed below. The attached sample "
        "PDF was used for its cover/overview, blue-gray striped indexes, detailed case sheets, and "
        "per-case evidence placement, not for its unrelated project content.",
        s["BodySmall"],
    ))
    story.append(Paragraph("Implemented modules inspected", s["Subsection"]))
    modules = [
        ["Layer", "Implemented project scope"],
        ["Frontend", "Public registration/login/OTP; role-protected patient, doctor, and admin workspaces; profiles; community; notifications; records, health, care plans, medication and appointments; emergency access; AI report analyzer/comparison and emergency assistant; video consultation/WebRTC."],
        ["Backend API", "Authentication and role middleware; users/profile; posts; notifications; patient health/records/upload/timeline/medications/appointments/doctor access/emergency/care plans/analysis; doctor clinical workflows; admin governance/audit/broadcast; Socket.IO signaling."],
        ["AI service", "FastAPI health, /generate and /analyze-report; report section/metric extraction; validation/completeness; local llama.cpp integration with deterministic fallback for analysis."],
        ["Data/external services", "Mongoose models and MongoDB; Cloudinary or local upload fallback; local LLM; Gemini emergency assistant; WebRTC signaling."],
    ]
    mod_data = [[paragraph(c, s["HeaderCell"] if i == 0 else s["Cell"]) for c in row] for i, row in enumerate(modules)]
    mod_table = Table(mod_data, colWidths=[1.25 * inch, 5.85 * inch], repeatRows=1)
    mod_table.setStyle(table_style())
    story.append(mod_table)
    story.append(Paragraph("Frameworks and recorded environment", s["Subsection"]))
    environment = [
        ["Area", "Frameworks / tools"],
        ["Frontend", "Vitest 5.0.5, React Testing Library 16.3.3, user-event 14.6.8, jsdom 29.1.1, axe-core 4.14.0, Vite 8.2.1; Node 22.19.0 / npm 10.9.3."],
        ["Backend", "Node built-in node:test + assert, jsonwebtoken; Node 22.19.0 / npm 10.9.3."],
        ["AI service", "pytest 9.1.1, FastAPI TestClient, FastAPI 0.115.12, HTTPX 0.28.1, Pydantic 2.13.5; Python 3.13.7."],
        ["Report / screenshots", "Python 3.13, ReportLab 4.4.10, Pillow 12.2.0, Chromium headless. Each case image shows a raw runner/audit excerpt from captured logs."],
    ]
    env_table = Table([[paragraph(c, s["HeaderCell"] if i == 0 else s["Cell"]) for c in row] for i, row in enumerate(environment)], colWidths=[1.25 * inch, 5.85 * inch], repeatRows=1)
    env_table.setStyle(table_style())
    story.append(env_table)
    story.append(Paragraph("Exact execution commands", s["Subsection"]))
    commands = [
        "cd frontend; npm test",
        "cd backend; npm test",
        "cd ai-service; python -m pytest -v tests",
        "cd frontend; npm run lint",
        "cd frontend; npm run build",
        "cd backend; npm audit --omit=dev --json",
        "cd frontend; npm audit --omit=dev --json",
    ]
    story.extend(paragraph("- " + command, s["BodySmall"]) for command in commands)
    story.append(Paragraph("Test files executed", s["Subsection"]))
    for path in [
        "frontend/src/pages/Login.test.jsx",
        "frontend/src/pages/Register.test.jsx",
        "frontend/src/components/Input.test.jsx",
        "frontend/src/components/Button.test.jsx",
        "frontend/src/services/api.test.js",
        "frontend/src/nonfunctional/accessibility.performance.test.jsx",
        "backend/test/auth.test.js",
        "backend/test/nonfunctional.test.js",
        "ai-service/tests/test_api.py",
    ]:
        story.append(paragraph("- " + path, s["BodySmall"]))
    story.append(PageBreak())

    # Summary and functional index
    story.append(Paragraph("2. Execution summary", s["Section"]))
    add_summary(story, "Functional testing", [
        ("Frontend UI and API client", 51, 51, 0, 0),
        ("Backend authentication and authorization", 51, 51, 0, 0),
        ("AI service API and analysis behavior", 12, 12, 0, 0),
        ("Functional total", 114, 114, 0, 0),
    ], s)
    add_summary(story, "Non-functional testing and quality checks", [
        ("Accessibility/performance/reliability tests", 8, 8, 0, 0),
        ("Production dependency audit", 2, 0, 2, 0),
        ("Frontend lint/build quality checks", 2, 2, 0, 0),
        ("Non-functional/quality total", 12, 10, 2, 0),
    ], s)
    add_summary(story, "Overall executed check totals", [
        ("Automated unit/component/API test cases", 122, 122, 0, 0),
        ("All executed checks, including audits and build/lint", 126, 124, 2, 0),
        ("Unexecuted scenarios documented separately", 0, 0, 0, 19),
    ], s)
    story.append(Spacer(1, 6))
    story.append(paragraph(
        "Functional tests are unit/component or in-process API tests. The React auth context and Axios "
        "adapter are mocked. The AI TestClient invokes the real FastAPI app in-process, while the LLM "
        "upstream is mocked. No live Express+MongoDB end-to-end workflow was executed.",
        s["BodySmall"],
    ))
    story.append(PageBreak())

    functional_cases = [case for case in executed if case.category == "Functional"]
    add_index(
        story,
        "3. Functional test case index",
        functional_cases,
        s,
        "All rows below correspond to a named test that passed in the recorded final run. Case IDs are report identifiers; the adjacent evidence image reproduces its captured test-runner output line.",
    )
    story.append(PageBreak())

    # Detailed functional cases grouped by service
    for service in ("Frontend", "Backend", "AI service"):
        service_cases = [case for case in functional_cases if case.service == service]
        story.append(Paragraph(f"4. Functional testing - {escape(service)}", s["Section"]))
        story.append(paragraph(
            {
                "Frontend": "Tests cover login/registration UI validation and navigation, reusable inputs/buttons, and Axios response/error normalization. UI auth context and Axios adapters are stubbed; these are not end-to-end backend calls.",
                "Backend": "Tests call authentication handlers and JWT/role middleware directly with mock Express response objects. They cover validation, logout cookie behavior, allowed/denied roles, and malformed/expired/invalid-signature JWT rejection. Database-backed paths are not reached.",
                "AI service": "Tests use FastAPI TestClient against actual in-process routes for health, generation, and report analysis. The local LLM boundary is mocked to verify response handling, schema validation, and offline behavior.",
            }[service],
            s["BodySmall"],
        ))
        for index, case in enumerate(service_cases):
            detailed_case(story, case, s, index + 1)
            story.append(PageBreak())

    # Integration evidence matrix
    story.append(Paragraph("5. Frontend-backend integration", s["Section"]))
    integration_rows = [
        ["Path", "Evidence class", "Observed", "Status"],
        ["React login/register -> AuthContext", "Mocked component test", "Auth function call arguments, form messages, and router result are asserted; no HTTP request reaches Express.", "PARTIAL / MOCKED"],
        ["Axios API client -> adapter", "Mocked adapter test", "Development base URL, credentials, response unwrapping, and error normalization are asserted.", "PARTIAL / MOCKED"],
        ["Frontend -> Express -> MongoDB", "Live integration", "No live server/database requests or persistence were executed.", "NOT EXECUTED"],
        ["Express report controller -> FastAPI", "Live integration", "Network hop from patient API to AI service was not run.", "NOT EXECUTED"],
        ["FastAPI route -> analysis pipeline -> mocked LLM", "In-process API", "Actual route and extraction/validation pipeline executed with mocked upstream model.", "PASSED / MOCKED UPSTREAM"],
        ["Video frontend -> Socket.IO/WebRTC peer", "Live integration", "No paired clients, camera, microphone, or signaling session.", "NOT EXECUTED"],
    ]
    itable = Table([[paragraph(c, s["HeaderCell"] if i == 0 else s["Cell"]) for c in row] for i, row in enumerate(integration_rows)], colWidths=[1.55 * inch, 1.15 * inch, 3.45 * inch, 0.95 * inch], repeatRows=1)
    itable.setStyle(table_style())
    story.append(itable)
    story.append(Spacer(1, 8))
    story.append(paragraph(
        "No result in this report should be interpreted as evidence that MongoDB persistence, Cloudinary, "
        "Gemini, the live local LLM process, or WebRTC works end-to-end. Those paths require a controlled "
        "integration environment and are listed as NOT EXECUTED.",
        s["BodySmall"],
    ))
    story.append(PageBreak())

    # Non-functional overview and index
    story.append(Paragraph("6. Non-functional testing overview", s["Section"]))
    story.append(paragraph(
        "Non-functional checks use measurable criteria only where the current test environment supports them. "
        "The controller p95 and React render measurements are in-process test measurements, not public API "
        "latency, browser page-load time, or production load results. Axe color-contrast analysis was disabled.",
        s["BodySmall"],
    ))
    nf_cases = [case for case in executed if case.category == "Non-functional"]
    nfa_rows = [[
        paragraph("Category", s["HeaderCell"]),
        paragraph("Cases / observed measurement", s["HeaderCell"]),
        paragraph("Result", s["HeaderCell"]),
    ]]
    nf_summary = [
        ("Accessibility", "2 axe runs; 0 enabled-rule violations each (contrast rule disabled).", "PASS"),
        ("Frontend render performance", "Login max 3.29ms; button max 0.34ms; asserted <500ms in jsdom.", "PASS"),
        ("Backend local validation performance", "p95 0.11ms across 50 in-process calls; asserted <100ms.", "PASS"),
        ("Reliability", "Repeated validation/logout/authorization result consistency checks passed.", "PASS"),
        ("Dependency security audit", "Frontend: 1 high Axios package finding. Backend: 1 critical, 1 high, 1 moderate vulnerable package.", "FAIL"),
        ("Static analysis", "Oxlint exited successfully; 60 warnings.", "PASS WITH WARNINGS"),
        ("Production build", "Vite build completed; emitted >500kB chunk advisory.", "PASS WITH WARNING"),
        ("Compatibility/load/DB resource tests", "No cross-browser matrix, live-service load, DB performance, or CPU/memory test.", "NOT EXECUTED"),
    ]
    nfa_rows.extend([[paragraph(c, s["Cell"]) for c in row] for row in nf_summary])
    nfa_table = Table(nfa_rows, colWidths=[1.35 * inch, 4.65 * inch, 1.1 * inch], repeatRows=1)
    nfa_table.setStyle(table_style())
    story.append(nfa_table)
    story.append(Spacer(1, 10))
    add_index(story, "Non-functional test case index", nf_cases, s)
    story.append(PageBreak())

    for case in nf_cases:
        detailed_case(story, case, s, 0)
        story.append(PageBreak())

    # Not executed and limitations
    story.append(Paragraph("7. Not executed: coverage gaps and required environment", s["Section"]))
    story.append(paragraph(
        "The following project-relevant scenarios are intentionally marked NOT EXECUTED. They are not "
        "counted as passing tests, and no screenshots are fabricated. Each row states the limitation and "
        "a suitable execution procedure for a future isolated staging run.",
        s["BodySmall"],
    ))
    add_index(story, "Not-executed scenario index", nonexecuted, s)
    story.append(PageBreak())
    for case in nonexecuted:
        detailed_case(story, case, s, 0)
        story.append(PageBreak())

    # Defect/security/quality summary
    story.append(Paragraph("8. Failed checks, defects, and recommendations", s["Section"]))
    story.append(Paragraph("Observed security audit findings", s["Subsection"]))
    security_items = [
        "Frontend production audit: axios is reported HIGH; locked range is below 1.20.0. npm audit reported fix available. Review the current supported patched release and validate compatibility before updating.",
        "Backend production audit: proxy-addr is reported CRITICAL (affected range 1.1.0-2.0.7); multer HIGH (package entry reports multiple multipart DoS advisories); qs MODERATE. npm audit reports fixes available. Prioritize a compatible dependency update and rerun tests/audit.",
        "The dependency audit is advisory matching, not proof that a vulnerable code path is exploitable in this deployment. No exploit validation was performed.",
    ]
    for text in security_items:
        story.append(paragraph("- " + text, s["BodySmall"]))
    story.append(Paragraph("Quality observations and resolved test-discovered issues", s["Subsection"]))
    for text in [
        "Final automated suites: 122/122 passed; no final test case failed or was skipped.",
        "Oxlint: 60 warnings (unused imports/variables/parameters) across frontend source; exit code was successful. Warnings remain for normal code-quality cleanup.",
        "Production build: Vite succeeded, with a bundle chunk larger than the configured 500kB warning threshold.",
        "Test work added semantic labels to shared inputs and the registration role select, and guarded non-string registration roles with a 400 response. Those behaviors are included in the final passing run.",
        "No test coverage percentage is reported: no coverage run was performed. No live database CRUD, real Express API, real upstream LLM, Cloudinary, Gemini, or WebRTC integration was verified.",
    ]:
        story.append(paragraph("- " + text, s["BodySmall"]))
    story.append(Paragraph("Recommended next steps", s["Subsection"]))
    for text in [
        "Update vulnerable frontend/backend production dependencies in a separate reviewed change; rerun npm audit and all functional suites.",
        "Add isolated MongoDB integration tests for representative patient/doctor/admin CRUD and role boundaries.",
        "Add end-to-end API tests for frontend -> Express and Express -> AI service using non-sensitive seeded data.",
        "Run browser-based axe/contrast checks and keyboard-only workflows at desktop and mobile viewports.",
        "Run HTTP-level concurrency/load tests with defined p95/p99 thresholds and collect DB/CPU/memory telemetry.",
    ]:
        story.append(paragraph("- " + text, s["BodySmall"]))
    story.append(PageBreak())

    # Final conclusion and raw evidence map
    story.append(Paragraph("9. Final execution conclusion", s["Section"]))
    story.append(paragraph(
        "The project's executed unit/component/in-process API checks passed: 55 frontend, 55 backend, "
        "and 12 AI-service tests. Additional React render, accessibility, repeated-response, controller "
        "latency, lint, and build checks completed. Two npm production dependency audits failed their "
        "zero-advisory acceptance expectation and identified findings requiring remediation. The report "
        "does not claim live database persistence, external service, full end-to-end integration, "
        "cross-browser compatibility, or production-load validation.",
        s["BodySmall"],
    ))
    story.append(Paragraph("Raw evidence files", s["Subsection"]))
    for path in [
        "test-report-evidence/logs/frontend-tests.log",
        "test-report-evidence/logs/backend-tests.log",
        "test-report-evidence/logs/ai-service-tests.log",
        "test-report-evidence/logs/frontend-lint.log",
        "test-report-evidence/logs/frontend-build.log",
        "test-report-evidence/logs/frontend-audit.json",
        "test-report-evidence/logs/backend-audit.json",
        "test-report-evidence/screenshots/ (one PNG per executed report case)",
        "scripts/generate_test_report.py",
    ]:
        story.append(paragraph("- " + path, s["BodySmall"]))
    story.append(Paragraph("Appendix: executed test case index", s["Subsection"]))
    add_index(story, "Automated and quality check index", executed, s)

    doc = SimpleDocTemplate(
        str(REPORT),
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.68 * inch,
        bottomMargin=0.65 * inch,
        title="MediConnect Test Cases Execution Report",
        author="MediConnect project test execution",
        subject="Evidence-based functional and non-functional test report",
    )
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"PDF: {REPORT}")
    print(f"Executed case/check index: {len(executed)}")
    print(f"Automated test cases: {len(frontend) + len(backend) + len(ai_cases)} passed")
    print(f"Non-executed scenarios: {len(nonexecuted)}")
    print(f"Individual Chromium evidence screenshots: {len(executed)}")


if __name__ == "__main__":
    build_report()
