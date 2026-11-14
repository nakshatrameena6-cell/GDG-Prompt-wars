from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator


class ErrorResponse(BaseModel):
    status: str = Field(default="error", description="Error status")
    message: str = Field(..., description="User-friendly error message")
    detail: Optional[str] = Field(default=None, description="Technical detail if applicable")


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Student full name")
    goal: Optional[str] = Field(None, min_length=1, max_length=50, description="Target career role ID")
    interests: Optional[str] = Field(None, max_length=500, description="Technical interests")
    skills: Optional[Dict[str, int]] = Field(None, description="Self-claimed skill ratings (0-5)")

    @field_validator("skills")
    @classmethod
    def validate_skill_ratings(cls, v: Optional[Dict[str, int]]) -> Optional[Dict[str, int]]:
        if v is None:
            return v
        if len(v) > 100:
            raise ValueError("Too many skills provided in a single request (max 100).")
        for skill_id, rating in v.items():
            if not isinstance(rating, int) or rating < 0 or rating > 5:
                raise ValueError(f"Skill rating for '{skill_id}' must be an integer between 0 and 5.")
            if len(skill_id) > 50 or not skill_id.replace("_", "").replace("-", "").isalnum():
                raise ValueError(f"Invalid skill identifier format: '{skill_id}'.")
        return v


class GoalRequest(BaseModel):
    profile_id: Optional[int] = Field(None, ge=1, description="Student profile ID")
    goal: Optional[str] = Field(None, min_length=1, max_length=50, description="Target role ID")
    new_goal: Optional[str] = Field(None, min_length=1, max_length=50, description="New target role ID")

    def get_target_goal(self) -> Optional[str]:
        return self.new_goal or self.goal


class CompleteModuleRequest(BaseModel):
    profile_id: Optional[int] = Field(None, ge=1, description="Student profile ID")


class AssessmentAnswerItem(BaseModel):
    question_id: str = Field(..., min_length=1, max_length=100, description="Question ID")
    skill_id: str = Field(..., min_length=1, max_length=50, description="Skill domain")
    selected_option: int = Field(..., ge=-1, le=10, description="Selected option index (-1 for unanswered)")
    response_time: float = Field(10.0, ge=0.0, le=600.0, description="Response time in seconds")
    difficulty: str = Field("MEDIUM", max_length=20, description="Question difficulty")
    error_tag: Optional[str] = Field(None, max_length=100, description="Diagnostic error tag")

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        valid_tiers = {"EASY", "MEDIUM", "HARD"}
        upper = v.upper()
        if upper not in valid_tiers:
            raise ValueError(f"Invalid difficulty '{v}'. Allowed: {valid_tiers}")
        return upper


class AssessmentSubmitRequest(BaseModel):
    profile_id: Optional[int] = Field(None, ge=1, description="Student profile ID")
    responses: List[AssessmentAnswerItem] = Field(..., min_length=1, max_length=100, description="List of answered questions")


class MentorQueryRequest(BaseModel):
    profile_id: Optional[int] = Field(None, ge=1, description="Student profile ID")
    query: str = Field(..., min_length=1, max_length=1000, description="Student inquiry for AI mentor")
