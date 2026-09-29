import json
import re
import httpx
from fastapi import HTTPException
from app.services.extractor import extract_document_text
from app.services.section_parser import parse_sections
from app.services.parameter_extractor import extract_all_parameters
from app.services.validator import validate_and_enforce_completeness

LLAMA_SERVER_URL = "http://127.0.0.1:8081/v1/chat/completions"


async def generate_response(prompt: str) -> str:
    payload = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are MediConnect's local AI assistant. "
                    "Explain medical information clearly and cautiously. "
                    "Do not diagnose patients or prescribe treatment."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.2,
        "max_tokens": 500,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(LLAMA_SERVER_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Local LLM server (llama.cpp :8081) is unavailable.")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Local LLM server request timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")


def repair_and_parse_json(content: str) -> dict:
    """
    Safely extracts and repairs JSON from LLM content if valid,
    or raises ValueError if JSON is unrecoverable.
    """
    if not content or not content.strip():
        raise ValueError("Empty output from LLM server")

    # Strip markdown code fences if present (e.g. ```json ... ```)
    cleaned = re.sub(r"```(?:json)?\s*", "", content, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*$", "", cleaned).strip()

    # Extract substring between first '{' and last '}'
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]

    # Remove trailing commas before closing braces/brackets
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ValueError(f"JSON parsing failed after repair attempt: {str(err)}")


async def analyze_medical_report(report_text: str, content_bytes: bytes | None = None, file_name: str = "report.txt") -> dict:
    # 1. Document & Text Extraction
    if content_bytes:
        extracted_doc = extract_document_text(content_bytes, file_name)
        text_to_process = extracted_doc.get("text") or report_text
    else:
        text_to_process = report_text

    if not text_to_process or not text_to_process.strip():
        raise HTTPException(status_code=400, detail="Report text or document content cannot be empty.")

    # 2. Section Detection & Parse
    parsed_sections_data = parse_sections(text_to_process)
    sections_dict = parsed_sections_data["sections"]

    clinical_context = {
        "clinicalNotes": parsed_sections_data["clinicalNotes"],
        "physicianImpression": parsed_sections_data["physicianImpression"],
        "remarks": parsed_sections_data["remarks"]
    }

    # 3. Medical Parameter Extraction & Deterministic Parsing
    extracted_metrics = extract_all_parameters(sections_dict)

    # 4. Prepare Verified Payload for Local Qwen Explanation
    prompt_payload = {
        "extractedMetricsCount": len(extracted_metrics),
        "sections": list(sections_dict.keys()),
        "metrics": extracted_metrics,
        "clinicalContext": clinical_context
    }

    system_prompt = """
You are MediConnect's medical report explanation assistant.
Your job is to convert VERIFIED structured laboratory findings into patient-friendly explanations.

CRITICAL CONSTRAINTS:
1. Do NOT change metric values, units, or reference ranges.
2. Do NOT change verified status (normal, low, high, attention, critical).
3. Provide a simple patient-friendly explanation (simpleDefinition, simpleMeaning, fieldTip) for EVERY metric listed in the input.
4. If physician impression or clinical notes are present, incorporate them into simplifiedSummary.
5. Return ONLY valid JSON without Markdown formatting.
"""

    user_prompt = f"""
Explain the following verified medical report parameters in plain language for the patient.

VERIFIED REPORT DATA:
{json.dumps(prompt_payload, indent=2)}

Return JSON matching this exact structure:
{{
  "simplifiedSummary": "2-3 simple sentences explaining overall body findings",
  "overallStatus": "normal",
  "statusHighlights": {{
    "healthyFindings": [],
    "attentionFindings": [],
    "criticalFindings": []
  }},
  "metrics": [
    {{
      "name": "test name",
      "value": "reported value",
      "status": "normal",
      "simpleDefinition": "1 simple sentence explaining what this parameter checks",
      "simpleMeaning": "1-2 sentences explaining what this result means for the body",
      "fieldTip": "practical non-diagnostic tip"
    }}
  ],
  "actionableAdvice": [
    "lifestyle or doctor follow-up tip 1"
  ],
  "disclaimer": "This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions."
}}
"""

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1600,
    }

    llm_analysis_dict = {}
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(LLAMA_SERVER_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            llm_analysis_dict = repair_and_parse_json(content)
    except (httpx.ConnectError, httpx.TimeoutException, HTTPException, ValueError) as err:
        print(f"Local LLM call warning (falling back to deterministic validator): {err}")
        llm_analysis_dict = {}

    # 5. Output Validation & Completeness Enforcement
    final_analysis = validate_and_enforce_completeness(
        extracted_metrics=extracted_metrics,
        llm_analysis=llm_analysis_dict,
        clinical_context=clinical_context
    )

    return final_analysis