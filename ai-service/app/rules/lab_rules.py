import re
from typing import Tuple, Optional


def parse_reference_range(ref_str: str) -> Tuple[Optional[float], Optional[float], str]:
    """
    Parses various reference range formats:
    - "12.0 - 16.0", "12-16", "4.0 - 5.6%" -> (12.0, 16.0, "range")
    - "< 5", "below 200", "under 100" -> (None, 5.0, "less_than")
    - "> 60", "above 40" -> (60.0, None, "greater_than")
    - "Negative", "Normal", "Absence" -> (None, None, "qualitative")
    """
    if not ref_str:
        return None, None, "range"

    clean_ref = ref_str.strip()

    # Qualitative reference (e.g. Negative, Normal, Non-reactive)
    if re.search(r"(?i)\b(negative|normal|non-reactive|absent|none)\b", clean_ref):
        return None, None, "qualitative"

    # Less than patterns: "< 5", "<5", "below 200", "under 100"
    match_less = re.search(r"(?:<|below|under)\s*([0-9.]+)", clean_ref, re.IGNORECASE)
    if match_less:
        return None, float(match_less.group(1)), "less_than"

    # Greater than patterns: "> 60", ">60", "above 40"
    match_greater = re.search(r"(?:>|above)\s*([0-9.]+)", clean_ref, re.IGNORECASE)
    if match_greater:
        return float(match_greater.group(1)), None, "greater_than"

    # Range pattern: "12.0 - 16.0", "12.0-16.0", "4.0 - 5.6%"
    match_range = re.search(r"([0-9.]+)\s*(?:-|–|to)\s*([0-9.]+)", clean_ref)
    if match_range:
        low = float(match_range.group(1))
        high = float(match_range.group(2))
        return low, high, "range"

    return None, None, "range"


def extract_numeric_value(val_str: str) -> Optional[float]:
    """
    Extracts first floating point or integer number from value string.
    E.g. "3.8 mg/dL" -> 3.8, "6,500 /µL" -> 6500.0, "7.4%" -> 7.4
    """
    if not val_str:
        return None
    clean_str = val_str.replace(",", "")
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", clean_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


# Known clinical panic / critical threshold indicators
CRITICAL_THRESHOLDS = [
    # (parameter regex, condition function, status)
    (r"(?i)\b(troponin|ck-mb)\b", lambda v, s: v > 0.04 or "high" in s or "abnormal" in s, "critical"),
    (r"(?i)\b(potassium|k\+)\b", lambda v, s: v < 2.8 or v > 6.2, "critical"),
    (r"(?i)\b(fasting\s+blood\s+glucose|fasting\s+glucose|glucose)\b", lambda v, s: v > 250 or v < 50, "critical"),
    (r"(?i)\b(hba1c)\b", lambda v, s: v >= 10.0, "critical"),
    (r"(?i)\b(creatinine)\b", lambda v, s: v >= 3.5, "critical"),
    (r"(?i)\b(systolic|bp|blood\s+pressure)\b", lambda v, s: v >= 180 or v <= 70, "critical"),
    (r"(?i)\b(spo2|oxygen\s+saturation)\b", lambda v, s: v <= 88, "critical"),
]


def classify_parameter_status(
    param_name: str,
    val_str: str,
    numeric_val: Optional[float],
    ref_low: Optional[float],
    ref_high: Optional[float],
    comp_type: str,
    reported_status: Optional[str] = None
) -> str:
    """
    Determines status deterministically:
    1. Preserves explicit reported status if present in source report.
    2. Performs numeric comparison against parsed reference bounds.
    3. Evaluates critical severity rules for panic limits.
    """
    clean_reported = (reported_status or "").lower().strip()

    # Rule 1: Explicit source report status
    status = "normal"
    if "critical" in clean_reported or "panic" in clean_reported:
        return "critical"
    elif "high" in clean_reported or clean_reported == "h":
        status = "high"
    elif "low" in clean_reported or clean_reported == "l":
        status = "low"
    elif "attention" in clean_reported or "abnormal" in clean_reported:
        status = "attention"

    # Standard default bounds if reference bounds not explicitly provided in report text
    if ref_low is None and ref_high is None and numeric_val is not None:
        p_name = param_name.lower()
        if "hba1c" in p_name:
            ref_low, ref_high = 4.0, 5.6
        elif "glucose" in p_name or "sugar" in p_name or "fasting" in p_name:
            ref_low, ref_high = 70.0, 99.0
        elif "ldl" in p_name:
            ref_high = 100.0
        elif "hdl" in p_name:
            ref_low = 40.0
        elif "cholesterol" in p_name:
            ref_high = 200.0
        elif "hemoglobin" in p_name:
            ref_low, ref_high = 12.0, 17.5
        elif "wbc" in p_name or "white blood" in p_name:
            ref_low, ref_high = 4500.0, 11000.0
        elif "platelet" in p_name:
            ref_low, ref_high = 150000.0, 450000.0
        elif "creatinine" in p_name:
            ref_low, ref_high = 0.7, 1.3
        elif "troponin" in p_name:
            ref_high = 0.04
        elif "crp" in p_name or "c-reactive" in p_name:
            ref_high = 5.0

    # Rule 2: Numeric range comparison if status was not explicit
    if status == "normal" and numeric_val is not None:
        if comp_type == "range":
            if ref_high is not None and numeric_val > ref_high:
                status = "high"
            elif ref_low is not None and numeric_val < ref_low:
                status = "low"
        elif comp_type == "less_than":
            if ref_high is not None and numeric_val >= ref_high:
                status = "high"
        elif comp_type == "greater_than":
            if ref_low is not None and numeric_val <= ref_low:
                status = "low"
        elif comp_type == "qualitative":
            if re.search(r"(?i)\b(positive|reactive|present|abnormal)\b", val_str):
                status = "attention"

    # Rule 3: Check panic / critical severity limits
    if numeric_val is not None:
        for name_pattern, cond_func, crit_status in CRITICAL_THRESHOLDS:
            if re.search(name_pattern, param_name):
                try:
                    if cond_func(numeric_val, status):
                        return crit_status
                except Exception:
                    pass

    return status