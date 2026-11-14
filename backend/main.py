import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.core.gap import analyze_gaps
from backend.core.planner import generate_roadmap, diff_goals
from backend.core.profile_analyst import generate_profile_summary
from backend.core.weakness import analyze_weakness_heuristics, calculate_verified_skill_level
from backend.core.agents import (
    orchestrate_career_intelligence,
    run_mentor_agent,
)
from backend.db import (
    init_db,
    reset_db,
    get_profile,
    get_default_profile,
    create_profile,
    update_profile,
    get_user_skills,
    set_skill_rating,
    batch_set_skills,
    get_completed_skills,
    mark_skill_completed,
    seed_sample_student,
    count_db_rows,
    record_assessment_attempt,
    record_assessment_responses,
    get_assessment_history,
    record_agent_event,
    get_agent_events,
)
from backend.schemas import (
    ErrorResponse,
    ProfileUpdateRequest,
    GoalRequest,
    CompleteModuleRequest,
    AssessmentSubmitRequest,
    MentorQueryRequest,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("placementpilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not get_default_profile():
        seed_sample_student()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="QUANTA - Adaptive AI Career Intelligence Platform",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data loader helpers
DATA_DIR = Path(__file__).resolve().parent / "data"

def load_data():
    with open(DATA_DIR / "skills.json", "r", encoding="utf-8") as f:
        skills = json.load(f)
    with open(DATA_DIR / "roles.json", "r", encoding="utf-8") as f:
        roles = json.load(f)
    with open(DATA_DIR / "resources.json", "r", encoding="utf-8") as f:
        resources = json.load(f)
    with open(DATA_DIR / "technical_questions.json", "r", encoding="utf-8") as f:
        questions = json.load(f)
    return skills, roles, resources, questions

SKILLS_CATALOG, ROLES_CATALOG, RESOURCES_CATALOG, TECHNICAL_QUESTIONS = load_data()
ROLES_MAP = {r["id"]: r for r in ROLES_CATALOG}
SKILLS_MAP = {s["id"]: s for s in SKILLS_CATALOG}
QUESTIONS_MAP = {q["id"]: q for q in TECHNICAL_QUESTIONS}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for request validation errors returning strict error format."""
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Invalid request data"
    if "Value error, " in first_error:
        first_error = first_error.replace("Value error, ", "")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"status": "error", "message": first_error},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure HTTP exceptions follow standardized error format."""
    message = exc.detail if isinstance(exc.detail, str) else "An error occurred"
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": message},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unexpected server errors."""
    logger.exception(f"Unhandled server error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": str(exc) or "Internal server error"},
    )


def resolve_profile(profile_id: Optional[int] = None) -> Dict[str, Any]:
    if profile_id is not None:
        p = get_profile(profile_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile with id {profile_id} not found."
            )
        return p

    p = get_default_profile()
    if not p:
        p = seed_sample_student()
    return p


def build_state_for_profile(
    profile: Dict[str, Any],
    weakness_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    profile_id = profile["id"]
    goal_id = profile["goal"]
    role = ROLES_MAP.get(goal_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown target role '{goal_id}'."
        )

    user_skills = get_user_skills(profile_id)
    completed_skills = get_completed_skills(profile_id)

    # Calculate gap report
    gap_report = analyze_gaps(
        required_skills=role["required_skills"],
        user_skills=user_skills,
        skills_catalog=SKILLS_CATALOG
    )

    # Generate adaptive roadmap
    roadmap = generate_roadmap(
        role_id=role["id"],
        role_title=role["title"],
        required_skills=role["required_skills"],
        skills_catalog=SKILLS_CATALOG,
        resources_catalog=RESOURCES_CATALOG,
        user_skills=user_skills,
        completed_skill_ids=completed_skills
    )

    # Deterministic profile summary
    profile_summary = generate_profile_summary(
        profile=profile,
        role=role,
        user_skills=user_skills,
        gap_report=gap_report,
        skills_catalog=SKILLS_CATALOG,
    )

    # Multi-agent collaboration orchestrator
    orchestration = orchestrate_career_intelligence(
        profile=profile,
        role=role,
        user_skills=user_skills,
        gap_report=gap_report,
        roadmap_modules=roadmap,
        weakness_data=weakness_data
    )

    return {
        "status": "success",
        "profile": profile,
        "role": role,
        "profile_summary": profile_summary,
        "skills": gap_report["items"],
        "gap_skills": gap_report["gap_skills"],
        "readiness": gap_report["readiness"],
        "verification_coverage": gap_report["verification_coverage"],
        "roadmap": roadmap,
        "agent_orchestration": orchestration,
    }


# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "phase": "2+3 demo ready",
        "llm_disabled": settings.LLM_DISABLED,
        "model": settings.GEMINI_MODEL,
    }


@app.get("/catalog")
@app.get("/api/catalog")
async def get_catalog():
    return {
        "status": "success",
        "roles": ROLES_CATALOG,
        "skills": SKILLS_CATALOG,
        "resources": RESOURCES_CATALOG,
    }


@app.get("/profile")
@app.get("/api/profile")
async def get_user_profile(id: Optional[int] = None):
    profile = resolve_profile(id)
    skills = get_user_skills(profile["id"])
    return {
        "status": "success",
        "profile": profile,
        "skills": skills,
    }


@app.put("/profile")
@app.put("/api/profile")
@app.post("/profile")
@app.post("/api/profile")
async def update_user_profile(payload: ProfileUpdateRequest, id: Optional[int] = None):
    profile = resolve_profile(id)
    p_id = profile["id"]

    if payload.goal and payload.goal not in ROLES_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid career goal '{payload.goal}'."
        )

    updated_profile = update_profile(
        p_id,
        name=payload.name,
        goal=payload.goal,
        interests=payload.interests
    )
    if payload.skills:
        batch_set_skills(p_id, payload.skills)

    return build_state_for_profile(updated_profile)


@app.get("/state/{id}")
@app.get("/api/state/{id}")
async def get_student_state(id: int):
    profile = resolve_profile(id)
    return build_state_for_profile(profile)


@app.get("/state")
@app.get("/api/state")
async def get_active_student_state():
    profile = resolve_profile()
    return build_state_for_profile(profile)


@app.post("/goal/preview")
@app.post("/api/goal/preview")
async def preview_goal_change(payload: GoalRequest):
    target_goal = payload.get_target_goal()
    if not target_goal or target_goal not in ROLES_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target goal '{target_goal}' is invalid or missing."
        )

    profile = resolve_profile(payload.profile_id)
    current_role = ROLES_MAP.get(profile["goal"])
    new_role = ROLES_MAP[target_goal]

    user_skills = get_user_skills(profile["id"])
    completed_skills = get_completed_skills(profile["id"])

    diff = diff_goals(
        current_goal_skills=current_role["required_skills"],
        new_goal_skills=new_role["required_skills"],
        user_skills=user_skills,
        completed_skill_ids=completed_skills,
        current_role_title=current_role["title"],
        new_role_title=new_role["title"]
    )

    return {
        "status": "success",
        "current_goal": current_role["id"],
        "new_goal": new_role["id"],
        **diff
    }


@app.post("/goal")
@app.post("/api/goal")
async def change_goal(payload: GoalRequest):
    target_goal = payload.get_target_goal()
    if not target_goal or target_goal not in ROLES_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target goal '{target_goal}' is invalid or missing."
        )

    profile = resolve_profile(payload.profile_id)
    old_goal = profile["goal"]
    updated_profile = update_profile(profile["id"], goal=target_goal)

    record_agent_event(
        profile["id"],
        "Career Matcher",
        "goal changed",
        f"Goal switched from '{old_goal}' to '{target_goal}'. Overlapping modules and verified skill ratings preserved."
    )

    return build_state_for_profile(updated_profile)


@app.post("/modules/{module_id}/complete")
@app.post("/api/modules/{module_id}/complete")
async def complete_module(module_id: str, payload: Optional[CompleteModuleRequest] = None):
    p_id = payload.profile_id if payload else None
    profile = resolve_profile(p_id)

    skill_id = module_id
    if module_id.startswith("mod-"):
        parts = module_id.split("-")
        skill_id = parts[-1]

    if skill_id not in SKILLS_MAP:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module or skill '{module_id}' not recognized."
        )

    mark_skill_completed(profile["id"], skill_id)
    record_agent_event(
        profile["id"],
        "Curriculum Planner",
        "module completed",
        f"Learner completed module '{skill_id}'. Downstream prerequisites recalculated."
    )
    return build_state_for_profile(profile)


@app.post("/demo/seed")
@app.post("/api/demo/seed")
async def demo_seed():
    profile = seed_sample_student()
    state = build_state_for_profile(profile)
    record_agent_event(
        profile["id"],
        "Orchestrator",
        "system reset",
        "Seeded fresh Sample Student profile with Python 3, SQL 3, HTML/CSS 2."
    )
    return {
        "status": "success",
        "message": "Sample student seeded successfully.",
        "state": state,
    }


@app.post("/demo/reset")
@app.post("/api/demo/reset")
async def demo_reset():
    reset_db()
    return {
        "status": "success",
        "message": "Database reset successfully."
    }


# ---------------------------------------------------------
# TECHNICAL ASSESSMENT & WEAKNESS ENDPOINTS
# ---------------------------------------------------------

@app.get("/assessment/questions")
@app.get("/api/assessment/questions")
async def get_assessment_questions(skill: Optional[str] = None):
    """
    Returns technical assessment questions without exposing the answer keys to client.
    """
    questions = TECHNICAL_QUESTIONS
    if skill:
        questions = [q for q in questions if q.get("skill_id") == skill]

    sanitized = [
        {
            "id": q["id"],
            "skill_id": q["skill_id"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q["difficulty"],
            "error_tag": q.get("error_tag"),
        }
        for q in questions
    ]
    return {
        "status": "success",
        "count": len(sanitized),
        "questions": sanitized,
    }


@app.post("/assessment/submit")
@app.post("/api/assessment/submit")
async def submit_assessment(payload: AssessmentSubmitRequest):
    """
    Evaluates student answers on backend against hand-written answer key.
    Calculates verified skill levels, extracts root-cause weakness heuristics,
    updates skill_ratings, and triggers agent orchestrator.
    """
    profile = resolve_profile(payload.profile_id)
    p_id = profile["id"]

    processed_responses = []
    correct_count = 0
    total = len(payload.responses)

    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit empty assessment responses."
        )

    for item in payload.responses:
        q_def = QUESTIONS_MAP.get(item.question_id)
        if not q_def:
            continue

        is_correct = (item.selected_option == q_def["answer"])
        if is_correct:
            correct_count += 1

        processed_responses.append({
            "question_id": item.question_id,
            "skill_id": q_def["skill_id"],
            "question": q_def["question"],
            "selected_option": item.selected_option,
            "correct_option": q_def["answer"],
            "is_correct": is_correct,
            "response_time": item.response_time,
            "difficulty": q_def["difficulty"],
            "error_tag": q_def.get("error_tag"),
            "explanation": q_def.get("explanation"),
        })

    accuracy_pct = round((correct_count / total) * 100.0, 1) if total > 0 else 0.0

    # 1. Record attempt and responses
    attempt_id = record_assessment_attempt(p_id, correct_count, total, accuracy_pct)
    record_assessment_responses(attempt_id, p_id, processed_responses)

    # 2. Extract deterministic weakness heuristics
    weakness_data = analyze_weakness_heuristics(processed_responses, SKILLS_MAP)

    # 3. Update verified skill levels in SQLite
    for s_id, verified_lvl in weakness_data.get("verified_levels", {}).items():
        if verified_lvl is not None:
            existing_user_skills = get_user_skills(p_id)
            claimed = existing_user_skills.get(s_id, {}).get("claimed_level", 0)
            set_skill_rating(p_id, s_id, claimed_level=claimed, verified_level=verified_lvl)

    record_agent_event(
        p_id,
        "Skill Auditor",
        "assessment evaluated",
        f"Technical assessment attempt #{attempt_id} completed: {correct_count}/{total} ({accuracy_pct}%). Verified ratings updated."
    )

    # 4. Return updated state with weakness synthesis
    updated_state = build_state_for_profile(profile, weakness_data=weakness_data)

    return {
        "status": "success",
        "attempt_id": attempt_id,
        "score": correct_count,
        "total": total,
        "accuracy_pct": accuracy_pct,
        "weakness_analysis": weakness_data,
        "reviewed_responses": processed_responses,
        "state": updated_state,
    }


# ---------------------------------------------------------
# AGENT TIMELINE & MENTOR ENDPOINTS
# ---------------------------------------------------------

@app.get("/agents/timeline")
@app.get("/api/agents/timeline")
async def get_timeline(profile_id: Optional[int] = None, limit: int = 50):
    """
    Returns actual backend-persisted agent execution events.
    """
    profile = resolve_profile(profile_id)
    events = get_agent_events(profile["id"], limit=limit)
    return {
        "status": "success",
        "count": len(events),
        "events": events,
    }


@app.post("/mentor/chat")
@app.post("/api/mentor/chat")
async def mentor_chat(payload: MentorQueryRequest):
    """
    Triggers the AI Mentor agent on-demand with contextual student data.
    """
    profile = resolve_profile(payload.profile_id)
    user_skills = get_user_skills(profile["id"])
    context = {
        "student_name": profile["name"],
        "goal": profile["goal"],
        "skills": user_skills,
    }
    advice = run_mentor_agent(profile["id"], payload.query, context)
    return {
        "status": "success",
        "mentor_response": advice,
    }


@app.get("/progress")
@app.get("/api/progress")
async def get_progress(profile_id: Optional[int] = None):
    """
    Returns persistent progress history and assessment attempts.
    """
    profile = resolve_profile(profile_id)
    history = get_assessment_history(profile["id"])
    user_skills = get_user_skills(profile["id"])
    return {
        "status": "success",
        "profile": profile,
        "assessment_history": history,
        "current_skills": user_skills,
    }
