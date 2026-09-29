import re
from typing import Dict, List, Any

# Section header patterns matching requirement #2
SECTION_PATTERNS = [
    (r"(?i)\b(complete\s+blood\s+count|cbc|haematology|hematology|hemogram)\b", "Complete Blood Count (CBC)"),
    (r"(?i)\b(cardiac\s+markers|cardiac\s+panel|cardiac\s+enzymes|troponin)\b", "Cardiac Markers"),
    (r"(?i)\b(inflammatory\s+markers|esr\s+&\s+crp|c-reactive\s+protein|inflammation)\b", "Inflammatory Markers"),
    (r"(?i)\b(kidney\s+function|renal\s+function|kft|rft|renal\s+profile|kidney\s+profile)\b", "Kidney Function"),
    (r"(?i)\b(liver\s+function|lft|hepatic\s+profile|liver\s+panel)\b", "Liver Function"),
    (r"(?i)\b(diabetes\s+profile|glycemic\s+index|glucose\s+profile|diabetic\s+panel|hba1c\s+&\s+glucose)\b", "Diabetes Profile"),
    (r"(?i)\b(lipid\s+profile|lipid\s+panel|cholesterol\s+profile)\b", "Lipid Profile"),
    (r"(?i)\b(arterial\s+blood\s+gas|abg|blood\s+gas\s+analysis)\b", "Arterial Blood Gas (ABG)"),
    (r"(?i)\b(urinalysis|urine\s+examination|urine\s+routine|routine\s+urine)\b", "Urinalysis"),
    (r"(?i)\b(vital\s+signs|vitals|patient\s+vitals)\b", "Vital Signs"),
    (r"(?i)\b(clinical\s+notes|clinical\s+history|patient\s+history)\b", "Clinical Notes"),
    (r"(?i)\b(physician\s+impression|physician\s+notes|clinical\s+impression|impression|diagnosis\/impression)\b", "Physician Impression"),
    (r"(?i)\b(remarks|comments|conclusion|doctor\s+remarks)\b", "Remarks"),
]


def detect_section_header(line: str) -> str | None:
    """
    Checks if a line represents a section header.
    Tolerates capitalization, colons, underscores, dashes, and extra spaces.
    Must not contain digits (which indicate metric measurement lines).
    """
    clean_line = line.strip().strip(":-_#*=")
    if not clean_line or len(clean_line) > 80 or re.search(r"\d", clean_line):
        return None

    for pattern, name in SECTION_PATTERNS:
        if re.search(pattern, clean_line):
            return name

    return None


def parse_sections(raw_text: str) -> Dict[str, Any]:
    """
    Parses document text into sections and narrative clinical context blocks.
    """
    lines = raw_text.splitlines()
    sections: Dict[str, List[str]] = {}
    current_section = "General Findings"
    sections[current_section] = []

    clinical_notes: List[str] = []
    physician_impression: List[str] = []
    remarks: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        detected = detect_section_header(stripped)
        if detected:
            current_section = detected
            if current_section not in sections:
                sections[current_section] = []
            continue

        # Accumulate narrative blocks
        if current_section == "Clinical Notes":
            clinical_notes.append(stripped)
        elif current_section == "Physician Impression":
            physician_impression.append(stripped)
        elif current_section == "Remarks":
            remarks.append(stripped)
        else:
            sections[current_section].append(stripped)

    # Clean empty sections
    sections = {k: v for k, v in sections.items() if v}

    return {
        "sections": sections,
        "clinicalNotes": clinical_notes,
        "physicianImpression": " ".join(physician_impression).strip(),
        "remarks": remarks,
    }
