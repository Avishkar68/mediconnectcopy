from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any


class Metric(BaseModel):
    section: str = Field(default="General")
    name: str = Field(default="Parameter")
    value: str = Field(default="N/A")
    numericValue: Optional[float] = None
    unit: Optional[str] = None
    referenceRange: Optional[str] = None
    referenceLow: Optional[float] = None
    referenceHigh: Optional[float] = None
    comparisonType: Optional[str] = Field(default="range")
    status: str = Field(default="normal")
    simpleDefinition: str = Field(default="")
    simpleMeaning: str = Field(default="")
    fieldTip: str = Field(default="")

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "normal"
        clean = v.lower().strip()
        if clean in ["normal", "high", "low", "attention", "critical"]:
            return clean
        return "normal"

    @field_validator("value", "name", "simpleDefinition", "simpleMeaning", "fieldTip", mode="before")
    @classmethod
    def validate_str_fields(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class SectionMetrics(BaseModel):
    sectionName: str = Field(default="General")
    metrics: List[Metric] = Field(default_factory=list)


class StatusHighlights(BaseModel):
    healthyFindings: List[str] = Field(default_factory=list)
    attentionFindings: List[str] = Field(default_factory=list)
    criticalFindings: List[str] = Field(default_factory=list)

    @field_validator("healthyFindings", "attentionFindings", "criticalFindings", mode="before")
    @classmethod
    def validate_findings_list(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return []
        res = []
        for item in v:
            if item is not None:
                if isinstance(item, dict):
                    res.append(str(item.get("message") or item.get("label") or item))
                else:
                    res.append(str(item))
        return res


class ClinicalContext(BaseModel):
    clinicalNotes: List[str] = Field(default_factory=list)
    physicianImpression: str = Field(default="")
    remarks: List[str] = Field(default_factory=list)


class AnalysisCoverage(BaseModel):
    extractedMetrics: int = 0
    explainedMetrics: int = 0
    complete: bool = True


class MedicalAnalysis(BaseModel):
    simplifiedSummary: str = Field(default="Medical report analysis completed.")
    overallStatus: str = Field(default="normal")
    statusHighlights: StatusHighlights = Field(default_factory=StatusHighlights)
    sections: List[SectionMetrics] = Field(default_factory=list)
    metrics: List[Metric] = Field(default_factory=list)
    clinicalContext: ClinicalContext = Field(default_factory=ClinicalContext)
    actionableAdvice: List[str] = Field(default_factory=list)
    disclaimer: str = Field(
        default="This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions."
    )
    analysisCoverage: AnalysisCoverage = Field(default_factory=AnalysisCoverage)

    @field_validator("overallStatus", mode="before")
    @classmethod
    def validate_overall_status(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "normal"
        clean = v.lower().strip()
        if clean in ["normal", "attention", "critical"]:
            return clean
        return "normal"

    @field_validator("actionableAdvice", mode="before")
    @classmethod
    def validate_actionable_advice(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return []
        return [str(item) for item in v if item is not None]
