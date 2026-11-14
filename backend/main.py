import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.core.gap import analyze_gaps
from backend.core.planner import generate_roadmap, diff_goals
from backend.core.profile_analyst import generate_profile_summary
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
)
from backend.schemas import (
    ErrorResponse,
    ProfileUpdateRequest,
    GoalRequest,
    CompleteModuleRequest,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("placementpilot")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not get_default_profile():
        seed_sample_student()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PlacementPilot API - Phase 1 Deterministic Foundation",
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
    return skills, roles, resources

SKILLS_CATALOG, ROLES_CATALOG, RESOURCES_CATALOG = load_data()
ROLES_MAP = {r["id"]: r for r in ROLES_CATALOG}
SKILLS_MAP = {s["id"]: s for s in SKILLS_CATALOG}



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


def build_state_for_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
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

    # Generate sequenced roadmap
    roadmap = generate_roadmap(
        role_id=role["id"],
        role_title=role["title"],
        required_skills=role["required_skills"],
        skills_catalog=SKILLS_CATALOG,
        resources_catalog=RESOURCES_CATALOG,
        user_skills=user_skills,
        completed_skill_ids=completed_skills
    )

    # Generate deterministic profile intelligence summary
    profile_summary = generate_profile_summary(
        profile=profile,
        role=role,
        user_skills=user_skills,
        gap_report=gap_report,
        skills_catalog=SKILLS_CATALOG,
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
    }


# ---------------------------------------------------------
# ROUTES: Both /path and /api/path supported
# ---------------------------------------------------------

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "phase": 1,
    }


@app.get("/catalog")
@app.get("/api/catalog")
async def get_catalog():
    """Returns catalog of roles, skills, and learning resources."""
    return {
        "status": "success",
        "roles": ROLES_CATALOG,
        "skills": SKILLS_CATALOG,
        "resources": RESOURCES_CATALOG,
    }


@app.get("/profile")
@app.get("/api/profile")
async def get_user_profile(id: Optional[int] = None):
    """Retrieves profile details along with current skill ratings."""
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
    """Updates profile name, career goal, and claimed skill ratings."""
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
    """Returns complete diagnostic state, skill gaps, and roadmap for a profile."""
    profile = resolve_profile(id)
    return build_state_for_profile(profile)


@app.get("/state")
@app.get("/api/state")
async def get_active_student_state():
    """Returns diagnostic state for current active student."""
    profile = resolve_profile()
    return build_state_for_profile(profile)


@app.post("/goal/preview")
@app.post("/api/goal/preview")
async def preview_goal_change(payload: GoalRequest):
    """
    Simulates changing career goal without writing anything to the database.
    Returns kept, added, and removed skills along with readiness before/after.
    """
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
    """
    Persistently changes career goal and recalculates roadmap.
    Preserves completed module achievements for overlapping skills.
    """
    target_goal = payload.get_target_goal()
    if not target_goal or target_goal not in ROLES_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target goal '{target_goal}' is invalid or missing."
        )

    profile = resolve_profile(payload.profile_id)
    updated_profile = update_profile(profile["id"], goal=target_goal)
    return build_state_for_profile(updated_profile)


@app.post("/modules/{module_id}/complete")
@app.post("/api/modules/{module_id}/complete")
async def complete_module(module_id: str, payload: Optional[CompleteModuleRequest] = None):
    """
    Marks a roadmap module as complete for the student.
    Unlocks dependent downstream modules in the roadmap.
    """
    p_id = payload.profile_id if payload else None
    profile = resolve_profile(p_id)

    # Extract skill_id from module_id if in format "mod-{role}-{skill}"
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
    return build_state_for_profile(profile)


@app.post("/demo/seed")
@app.post("/api/demo/seed")
async def demo_seed():
    """
    Seeds database with Sample Student:
    Name: 'Sample Student'
    Goal: 'full_stack_developer'
    Skills: Python 3, SQL 3, html_css 2
    """
    profile = seed_sample_student()
    state = build_state_for_profile(profile)
    return {
        "status": "success",
        "message": "Sample student seeded successfully.",
        "state": state,
    }


@app.post("/demo/reset")
@app.post("/api/demo/reset")
async def demo_reset():
    """Resets database schema to fresh state."""
    reset_db()
    return {
        "status": "success",
        "message": "Database reset successfully."
    }
