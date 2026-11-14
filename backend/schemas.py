from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    status: str = Field(default="error", description="Error status")
    message: str = Field(..., description="User-friendly error message")
    detail: Optional[str] = Field(default=None, description="Technical detail if applicable")


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    interests: Optional[str] = None
    skills: Optional[Dict[str, int]] = None


class GoalRequest(BaseModel):
    profile_id: Optional[int] = None
    goal: Optional[str] = None
    new_goal: Optional[str] = None

    def get_target_goal(self) -> Optional[str]:
        return self.new_goal or self.goal


class CompleteModuleRequest(BaseModel):
    profile_id: Optional[int] = None


class AssessmentAnswerItem(BaseModel):
    question_id: str
    skill_id: str
    selected_option: int
    response_time: float = 10.0
    difficulty: str = "MEDIUM"
    error_tag: Optional[str] = None


class AssessmentSubmitRequest(BaseModel):
    profile_id: Optional[int] = None
    responses: List[AssessmentAnswerItem]


class MentorQueryRequest(BaseModel):
    profile_id: Optional[int] = None
    query: str
