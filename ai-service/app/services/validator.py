from typing import Dict, List, Any


DEFAULT_EXPLANATIONS = {
    "hemoglobin": ("Protein in red blood cells that carries oxygen from lungs to the rest of the body.", "Supports healthy oxygen supply to tissues."),
    "white blood cells": ("Immune system cells that fight off infections, bacteria, and viruses.", "Measures body's active immune response."),
    "wbc": ("Immune system cells that fight off infections, bacteria, and viruses.", "Measures body's active immune response."),
    "creatinine": ("Waste product produced by muscles and filtered out of the blood by healthy kidneys.", "Indicates how efficiently your kidneys are clearing waste."),
    "fasting blood glucose": ("Amount of sugar circulating in blood after fasting overnight.", "Shows how well insulin manages morning sugar level."),
    "hba1c": ("Average blood sugar level over the past 2 to 3 months.", "Gives long-term picture of glucose control."),
    "troponin": ("Protein released into blood when heart muscle cells undergo stress or injury.", "Key marker for cardiac muscle health."),
    "crp": ("Protein produced by the liver that rises in response to inflammation.", "Measures active swelling or inflammation in the body."),
    "total cholesterol": ("Total sum of fats circulating in your bloodstream.", "Reflects overall blood lipid concentration."),
    "systolic bp": ("Pressure in blood vessels when your heart beats.", "Measures vascular pressure during heart contraction.")
}


def validate_and_enforce_completeness(
    extracted_metrics: List[Dict[str, Any]],
    llm_analysis: Dict[str, Any],
    clinical_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validates LLM output against verified extracted parameters.
    1. Ensures explained metrics count matches extracted metrics count.
    2. Overrides overallStatus if any abnormal parameters exist.
    3. Merges critical findings into statusHighlights.
    4. Calculates analysisCoverage stats.
    """
    explained_map: Dict[str, Dict[str, Any]] = {}

    # Map LLM explained metrics by name
    llm_metrics = llm_analysis.get("metrics") or llm_analysis.get("metricsBreakdown") or []
    for m in llm_metrics:
        if isinstance(m, dict) and m.get("name"):
            explained_map[m["name"].lower().strip()] = m

    final_metrics: List[Dict[str, Any]] = []
    healthy_findings: List[str] = []
    attention_findings: List[str] = []
    critical_findings: List[str] = []

    has_abnormal = False
    has_critical = False

    for item in extracted_metrics:
        name_lower = item["name"].lower().strip()
        llm_match = explained_map.get(name_lower)

        # Preserve verified extracted values and status!
        val_str = item["value"]
        ref_str = item.get("referenceRange") or "N/A"
        status = item.get("status") or "normal"

        if status in ["high", "low", "attention"]:
            has_abnormal = True
        elif status == "critical":
            has_abnormal = True
            has_critical = True

        # Definition and meaning
        def_text = (llm_match.get("simpleDefinition") if llm_match else "") or ""
        meaning_text = (llm_match.get("simpleMeaning") if llm_match else "") or ""
        field_tip = (llm_match.get("fieldTip") if llm_match else "") or ""

        if not def_text or not meaning_text:
            for key, (d, m_text) in DEFAULT_EXPLANATIONS.items():
                if key in name_lower:
                    if not def_text:
                        def_text = d
                    if not meaning_text:
                        meaning_text = m_text
                    break

        if not meaning_text:
            if status == "normal":
                meaning_text = f"Your {item['name']} result ({val_str}) is within standard healthy reference limits."
            elif status == "high":
                meaning_text = f"Your {item['name']} result ({val_str}) is elevated above standard reference bounds ({ref_str})."
            elif status == "low":
                meaning_text = f"Your {item['name']} result ({val_str}) is lower than standard reference bounds ({ref_str})."
            else:
                meaning_text = f"Your {item['name']} result ({val_str}) requires clinical attention."

        if not field_tip:
            if status == "normal":
                field_tip = "Maintain current healthy diet and lifestyle habits."
            else:
                field_tip = "Discuss this finding with your attending physician."

        metric_entry = {
            "section": item.get("section", "General"),
            "name": item["name"],
            "value": val_str,
            "numericValue": item.get("numericValue"),
            "unit": item.get("unit"),
            "referenceRange": ref_str,
            "referenceLow": item.get("referenceLow"),
            "referenceHigh": item.get("referenceHigh"),
            "comparisonType": item.get("comparisonType", "range"),
            "status": status,
            "simpleDefinition": def_text,
            "simpleMeaning": meaning_text,
            "fieldTip": field_tip
        }
        final_metrics.append(metric_entry)

        # Categorize into status highlights
        finding_msg = f"{item['name']} is {val_str} (Reference: {ref_str})"
        if status == "normal":
            healthy_findings.append(finding_msg)
        elif status == "critical":
            critical_findings.append(f"CRITICAL: {finding_msg}")
        else:
            attention_findings.append(finding_msg)

    # Determine overall status
    overall_status = llm_analysis.get("overallStatus", "normal")
    if has_critical:
        overall_status = "critical"
    elif has_abnormal and overall_status == "normal":
        overall_status = "attention"

    # Merge status highlights from LLM if present
    existing_highlights = llm_analysis.get("statusHighlights", {})
    if isinstance(existing_highlights, dict):
        for h in existing_highlights.get("healthyFindings", []):
            if isinstance(h, str) and h not in healthy_findings:
                healthy_findings.append(h)
        for a in existing_highlights.get("attentionFindings", []):
            if isinstance(a, str) and a not in attention_findings:
                attention_findings.append(a)
        for c in existing_highlights.get("criticalFindings", []):
            if isinstance(c, str) and c not in critical_findings:
                critical_findings.append(c)

    # Group metrics into sections
    sections_map: Dict[str, List[Dict[str, Any]]] = {}
    for m in final_metrics:
        sec = m["section"]
        if sec not in sections_map:
            sections_map[sec] = []
        sections_map[sec].append(m)

    sections_list = [{"sectionName": k, "metrics": v} for k, v in sections_map.items()]

    extracted_count = len(extracted_metrics)
    explained_count = len(final_metrics)

    if extracted_count == 0:
        return {
            "simplifiedSummary": "No medical parameters could be extracted from the provided report text. Please verify that your report text contains diagnostic test parameter names and measurements.",
            "overallStatus": "attention",
            "statusHighlights": {
                "healthyFindings": [],
                "attentionFindings": ["No medical parameters could be extracted from this report text."],
                "criticalFindings": []
            },
            "sections": [],
            "metrics": [],
            "clinicalContext": clinical_context,
            "actionableAdvice": [
                "Ensure your report text includes legible test names and lab result numbers.",
                "Consult your attending physician if you need help interpreting your printed document."
            ],
            "disclaimer": llm_analysis.get("disclaimer") or (
                "This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. "
                "Always consult your attending doctor for clinical decisions."
            ),
            "analysisCoverage": {
                "extractedMetrics": 0,
                "explainedMetrics": 0,
                "complete": False
            },
            "analysisWarning": "No medical parameters could be extracted from this report."
        }

    coverage = {
        "extractedMetrics": extracted_count,
        "explainedMetrics": explained_count,
        "complete": (explained_count >= extracted_count)
    }

    # Simplified summary check
    summary = llm_analysis.get("simplifiedSummary", "").strip()
    if not summary or (has_abnormal and "normal" in summary.lower() and "all" in summary.lower()):
        if has_critical:
            summary = f"The medical report contains critical laboratory parameters that require immediate physician review and follow-up."
        elif has_abnormal:
            summary = f"The medical report contains several elevated or low parameters across lab sections that require lifestyle adjustments and doctor advice."
        else:
            summary = f"All {extracted_count} analyzed medical report parameters are within safe reference limits."

    return {
        "simplifiedSummary": summary,
        "overallStatus": overall_status,
        "statusHighlights": {
            "healthyFindings": healthy_findings,
            "attentionFindings": attention_findings,
            "criticalFindings": critical_findings
        },
        "sections": sections_list,
        "metrics": final_metrics,
        "clinicalContext": clinical_context,
        "actionableAdvice": llm_analysis.get("actionableAdvice") or [
            "Review findings with your attending doctor during your next visit.",
            "Maintain a balanced diet, proper hydration, and routine health checks."
        ],
        "disclaimer": llm_analysis.get("disclaimer") or (
            "This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. "
            "Always consult your attending doctor for clinical decisions."
        ),
        "analysisCoverage": coverage
    }
