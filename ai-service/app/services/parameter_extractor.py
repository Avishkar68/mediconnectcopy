import re
from typing import Dict, List, Any
from app.rules.lab_rules import parse_reference_range, extract_numeric_value, classify_parameter_status


def parse_line_for_parameter(line: str, section_name: str) -> Dict[str, Any] | None:
    """
    Extracts structured metric parameters from a line of report text.
    Returns structured metric dict or None if line is not a parameter measurement.
    """
    clean_line = line.strip()
    if not clean_line or len(clean_line) < 3:
        return None

    # Skip section header titles, page markers, or purely decorative lines
    if clean_line.startswith("---") or clean_line.startswith("===") or clean_line.startswith("***"):
        return None

    # Pattern 1: Parameter: Value (Ref: Range) [Status] or Parameter Value Unit Ref Range Status
    # E.g. "Creatinine: 3.8 mg/dL (Ref: 0.7 - 1.3 mg/dL) High"
    # E.g. "HbA1c: 7.4% (Ref: 4.0 - 5.6%)"
    # E.g. "Fasting Blood Glucose: 148 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]"

    # Extract optional reported status at end of line (e.g. High, Low, Normal, Critical, H, L, Abnormal)
    status_match = re.search(r"\[?\b(HIGH|LOW|NORMAL|CRITICAL|ABNORMAL|ATTENTION|PANIC|H|L)\b\]?\s*$", clean_line, re.IGNORECASE)
    reported_status = status_match.group(1) if status_match else None

    # Extract optional reference range inside parenthesis or after "Ref:", "Reference:", "Range:"
    ref_match = re.search(r"(?:ref|reference|range|normal range)[\s:]*([^)\n]+)", clean_line, re.IGNORECASE)
    ref_str = ref_match.group(1).strip() if ref_match else ""

    if not ref_str:
        # Check for range pattern in line like (0.7 - 1.3) or (13.5-17.5) or (< 5)
        paren_match = re.search(r"\(([^)]+)\)", clean_line)
        if paren_match:
            candidate = paren_match.group(1).strip()
            if any(char.isdigit() for char in candidate) or "negative" in candidate.lower() or "normal" in candidate.lower():
                ref_str = candidate

    # Split line by first colon, or by tab/pipe/double spaces if no colon
    if ":" in clean_line:
        parts = clean_line.split(":", 1)
    else:
        parts = re.split(r"[\t|]|\s{2,}", clean_line)

    if len(parts) >= 2:
        name_part = parts[0].strip(" *-•#")
        val_part_raw = parts[1].strip()
        val_part = re.sub(r"\(.*?\)", "", val_part_raw)
        val_part = re.sub(r"\[.*?\]", "", val_part).strip()

        # If name looks like a medical parameter and val_part contains numbers or qualitative status
        if name_part and len(name_part) < 60 and (re.search(r"\d", val_part) or re.search(r"(?i)\b(positive|negative|normal|high|low)\b", val_part)):

            # Extract value and unit
            unit_match = re.search(r"([0-9.]+)\s*([a-zA-Z%/µuLmgdLmmolL]+)", val_part)
            unit = unit_match.group(2) if unit_match else None

            numeric_val = extract_numeric_value(val_part)
            ref_low, ref_high, comp_type = parse_reference_range(ref_str)

            status = classify_parameter_status(
                param_name=name_part,
                val_str=val_part,
                numeric_val=numeric_val,
                ref_low=ref_low,
                ref_high=ref_high,
                comp_type=comp_type,
                reported_status=reported_status
            )

            return {
                "section": section_name,
                "name": name_part,
                "value": val_part,
                "numericValue": numeric_val,
                "unit": unit,
                "referenceRange": ref_str or None,
                "referenceLow": ref_low,
                "referenceHigh": ref_high,
                "comparisonType": comp_type,
                "reportedStatus": reported_status or status,
                "status": status,
                "simpleDefinition": "",
                "simpleMeaning": "",
                "fieldTip": ""
            }

    # Pattern 2: Single line measurement with name value unit (e.g., "Hemoglobin 14.2 g/dL")
    num_match = re.search(r"^([A-Za-z0-9\s()/\-]+?)\s+([0-9.]+\s*[a-zA-Z%/µuLmgdLmmolL]*)(?:\s+(.*))?$", clean_line)
    if num_match:
        name_part = num_match.group(1).strip(" *-•#")
        val_part = num_match.group(2).strip()
        rest = num_match.group(3) or ""

        if len(name_part) > 2 and len(name_part) < 50 and re.search(r"\d", val_part):
            unit_match = re.search(r"([0-9.]+)\s*([a-zA-Z%/µuLmgdLmmolL]+)", val_part)
            unit = unit_match.group(2) if unit_match else None

            numeric_val = extract_numeric_value(val_part)
            ref_low, ref_high, comp_type = parse_reference_range(ref_str or rest)

            status = classify_parameter_status(
                param_name=name_part,
                val_str=val_part,
                numeric_val=numeric_val,
                ref_low=ref_low,
                ref_high=ref_high,
                comp_type=comp_type,
                reported_status=reported_status
            )

            return {
                "section": section_name,
                "name": name_part,
                "value": val_part,
                "numericValue": numeric_val,
                "unit": unit,
                "referenceRange": ref_str or rest or None,
                "referenceLow": ref_low,
                "referenceHigh": ref_high,
                "comparisonType": comp_type,
                "reportedStatus": reported_status or status,
                "status": status,
                "simpleDefinition": "",
                "simpleMeaning": "",
                "fieldTip": ""
            }

    return None


def extract_all_parameters(sections_dict: Dict[str, List[str]]) -> List[Dict[str, Any]]:
    """
    Scans every section's lines to extract ALL medical parameters without stopping.
    """
    extracted_metrics: List[Dict[str, Any]] = []
    seen_keys = set()

    for sec_name, lines in sections_dict.items():
        for line in lines:
            metric = parse_line_for_parameter(line, sec_name)
            if metric:
                key = f"{sec_name}:{metric['name'].lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    extracted_metrics.append(metric)

    return extracted_metrics
