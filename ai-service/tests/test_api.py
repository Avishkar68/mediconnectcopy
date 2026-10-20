import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
import app.services.llm_service as llm_service


client = TestClient(app)


class MockLLMResponse:
    def __init__(self, content):
        self.content = content

    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": self.content}}]}


class MockAsyncClient:
    def __init__(self, content, **_kwargs):
        self.content = content

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, _url, json=None):
        return MockLLMResponse(self.content)


def mock_llm(monkeypatch, content):
    monkeypatch.setattr(
        llm_service.httpx,
        "AsyncClient",
        lambda **kwargs: MockAsyncClient(content, **kwargs),
    )


def test_health_endpoint_returns_service_status():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "mediconnect-ai",
        "version": "0.1.0",
    }


def test_generate_rejects_missing_prompt():
    response = client.post("/generate", json={})

    assert response.status_code == 422


def test_generate_rejects_whitespace_prompt():
    response = client.post("/generate", json={"prompt": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Prompt cannot be empty."


def test_generate_returns_mocked_local_llm_response(monkeypatch):
    mock_llm(monkeypatch, "Please discuss lab results with your clinician.")

    response = client.post("/generate", json={"prompt": "Explain this result"})

    assert response.status_code == 200
    assert response.json() == {
        "response": "Please discuss lab results with your clinician."
    }


def test_analyze_report_rejects_missing_report_text():
    response = client.post("/analyze-report", json={})

    assert response.status_code == 422


def test_analyze_report_rejects_whitespace_report_text():
    response = client.post("/analyze-report", json={"reportText": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Report text cannot be empty."


def test_analyze_report_extracts_and_preserves_verified_metrics(monkeypatch):
    mock_llm(
        monkeypatch,
        json.dumps(
            {
                "simplifiedSummary": "Hemoglobin is within the expected range.",
                "overallStatus": "normal",
                "metrics": [
                    {
                        "name": "Hemoglobin",
                        "simpleDefinition": "Oxygen-carrying protein.",
                        "simpleMeaning": "This result is within the provided range.",
                        "fieldTip": "Discuss results with your clinician.",
                    }
                ],
            }
        ),
    )

    response = client.post(
        "/analyze-report",
        json={
            "reportTitle": "CBC",
            "reportText": (
                "Complete Blood Count (CBC)\n"
                "Hemoglobin: 14.2 g/dL (Ref: 12.0 - 17.5 g/dL)\n"
            ),
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["metrics"][0]["name"] == "Hemoglobin"
    assert result["metrics"][0]["numericValue"] == 14.2
    assert result["metrics"][0]["status"] == "normal"
    assert result["analysisCoverage"]["complete"] is True


def test_analysis_rejects_invalid_llm_schema(monkeypatch):
    async def invalid_analysis(_report_text):
        return {"metrics": [{"numericValue": "not-a-number"}]}

    monkeypatch.setattr("app.main.analyze_medical_report", invalid_analysis)

    response = client.post(
        "/analyze-report",
        json={"reportText": "Hemoglobin: 14.2 g/dL"},
    )

    assert response.status_code == 422
    assert "Failed to validate LLM analysis schema" in response.json()["detail"]


def test_repair_and_parse_json_handles_code_fences_and_trailing_commas():
    parsed = llm_service.repair_and_parse_json(
        '```json\n{"overallStatus":"normal","metrics":[],}\n```'
    )

    assert parsed == {"overallStatus": "normal", "metrics": []}


def test_repair_and_parse_json_rejects_empty_llm_output():
    with pytest.raises(ValueError, match="Empty output from LLM server"):
        llm_service.repair_and_parse_json("  ")


def test_analyze_report_falls_back_to_deterministic_result_when_llm_is_offline(monkeypatch):
    class OfflineAsyncClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, *_args, **_kwargs):
            raise llm_service.httpx.ConnectError("offline")

    monkeypatch.setattr(llm_service.httpx, "AsyncClient", OfflineAsyncClient)

    response = client.post(
        "/analyze-report",
        json={"reportText": "Hemoglobin: 14.2 g/dL"},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["metrics"][0]["name"] == "Hemoglobin"
    assert result["analysisCoverage"]["complete"] is True
    assert result["metrics"][0]["simpleMeaning"] == "Supports healthy oxygen supply to tissues."


def test_generate_returns_service_unavailable_when_local_llm_is_offline(monkeypatch):
    class OfflineAsyncClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, *_args, **_kwargs):
            raise llm_service.httpx.ConnectError("offline")

    monkeypatch.setattr(llm_service.httpx, "AsyncClient", OfflineAsyncClient)

    response = client.post("/generate", json={"prompt": "Explain this result"})

    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"]
