from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.services.llm_service import analyze_medical_report, generate_response
from app.schemas.analysis import MedicalAnalysis

app = FastAPI(
    title="MediConnect AI",
    version="0.1.0"
)


class GenerateRequest(BaseModel):
    prompt: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "mediconnect-ai",
        "version": "0.1.0"
    }


@app.post("/generate")
async def generate(request: GenerateRequest):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    response = await generate_response(request.prompt)
    return {
        "response": response
    }


class AnalyzeReportRequest(BaseModel):
    reportText: str
    reportTitle: str | None = None
    recordId: str | None = None


@app.post("/analyze-report", response_model=MedicalAnalysis)
async def analyze_report(request: AnalyzeReportRequest):
    if not request.reportText or not request.reportText.strip():
        raise HTTPException(status_code=400, detail="Report text cannot be empty.")

    result = await analyze_medical_report(
        request.reportText
    )

    try:
        validated = MedicalAnalysis.model_validate(result)
        return validated
    except Exception as err:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to validate LLM analysis schema: {str(err)}"
        )