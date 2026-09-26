from pydantic import BaseModel, Field, field_validator
from typing import Optional


class AnalyzeRequest(BaseModel):
    message: str = Field(..., description="Student placement preparation input or query")

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Input message cannot be empty or whitespace only.")
        return v.strip()


class AnalyzeResponse(BaseModel):
    status: str = Field(default="success", description="Status of the analysis")
    message: str = Field(..., description="Structured diagnostic placement advice from Gemini")


class GeminiAnalysisResult(BaseModel):
    status: str = Field(..., description="Response status ('success')")
    message: str = Field(..., description="Placement preparation advice/guidance")


class ErrorResponse(BaseModel):
    status: str = Field(default="error", description="Error status")
    message: str = Field(..., description="User-friendly error message")
    detail: Optional[str] = Field(default=None, description="Technical detail if applicable")
