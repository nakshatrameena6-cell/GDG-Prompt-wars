"""
backend/core/profile_analyst.py - Deterministic Profile Analyst foundation.

Pure functions for synthesizing learner interests, self-reported strengths, and
primary skill gaps into an objective observation summary without hallucination or LLM bias.
Zero I/O.
"""

from typing import Dict, Any, List, Optional, TypedDict

DEFAULT_ROLE_INTERESTS: Dict[str, str] = {
    "full_stack_developer": "Full-stack web architecture, API engineering, relational databases",
    "data_analyst": "Data analysis, tabular data manipulation, exploratory visualization, SQL",
    "frontend_developer": "Modern UI/UX components, client-side state management, responsive design",
}


class ClaimedStrength(TypedDict):
    """Represents a self-reported or high-competency skill area."""
    skill_id: str
    skill_name: str
    claimed_level: int


class SkillGapSummary(TypedDict):
    """Represents a prioritized skill deficit requiring remediation."""
    skill_id: str
    skill_name: str
    gap: int
    required_level: int
    claimed_level: int


class ProfileSummaryReport(TypedDict):
    """Structured analytical summary of learner capabilities and focus areas."""
    interests: str
    claimed_strengths: List[ClaimedStrength]
    selected_career: Dict[str, str]
    main_skill_gaps: List[SkillGapSummary]
    observation: str


def generate_profile_summary(
    profile: Dict[str, Any],
    role: Dict[str, Any],
    user_skills: Dict[str, Dict[str, Any]],
    gap_report: Dict[str, Any],
    skills_catalog: List[Dict[str, Any]]
) -> ProfileSummaryReport:
    """
    Generates a deterministic profile summary based strictly on existing learner data.

    Synthesizes declared career interests, claimed proficiencies, and immediate role deficits
    into an actionable diagnostic observation.

    Args:
        profile: Student profile metadata (name, interests, etc.).
        role: Target career role metadata (id, title, etc.).
        user_skills: Current student skill state.
        gap_report: Output from gap analysis containing itemized deficit calculations.
        skills_catalog: Master skills catalogue.

    Returns:
        ProfileSummaryReport: Synthesized strengths, prioritized gaps, and objective observation text.
    """
    student_name = profile.get("name") or "Student"
    role_id = role.get("id", "")
    role_title = role.get("title") or role_id.replace("_", " ").title()

    skills_map = {s["id"]: s for s in skills_catalog}

    # 1. Interests
    interests = profile.get("interests")
    if not interests or not interests.strip():
        interests = DEFAULT_ROLE_INTERESTS.get(
            role_id,
            "Software engineering and professional technical development"
        )

    # 2. Claimed strengths (claimed_level >= 3, or highest claimed skills)
    strengths: List[ClaimedStrength] = []
    for s_id, u_data in user_skills.items():
        claimed = u_data.get("claimed_level", 0)
        if claimed >= 3:
            s_info = skills_map.get(s_id, {})
            name = s_info.get("name", s_id.replace("_", " ").title())
            strengths.append({
                "skill_id": s_id,
                "skill_name": name,
                "claimed_level": claimed,
            })
    strengths.sort(key=lambda x: x["claimed_level"], reverse=True)

    # 3. Main skill gaps (items where gap > 0)
    gap_items = [
        item for item in gap_report.get("items", [])
        if item.get("gap", 0) > 0
    ]
    gap_items.sort(key=lambda x: x["gap"], reverse=True)

    main_skill_gaps: List[SkillGapSummary] = [
        {
            "skill_id": item["skill_id"],
            "skill_name": item["skill_name"],
            "gap": item["gap"],
            "required_level": item["required"],
            "claimed_level": item["claimed"],
        }
        for item in gap_items
    ]

    # 4. Short, transparent profile observation
    strengths_names = [s["skill_name"] for s in strengths]
    gaps_names = [g["skill_name"] for g in main_skill_gaps[:3]]

    if strengths_names and gaps_names:
        obs = (
            f"{student_name} displays claimed strength in {', '.join(strengths_names)}. "
            f"To achieve target readiness for {role_title}, primary developmental focus is closing "
            f"{len(main_skill_gaps)} gap(s), led by {', '.join(gaps_names)}."
        )
    elif gaps_names:
        obs = (
            f"{student_name} is establishing foundational competencies for {role_title}. "
            f"Initial curriculum priority focuses on addressing gaps in {', '.join(gaps_names)}."
        )
    elif strengths_names:
        obs = (
            f"{student_name} demonstrates strong alignment with {role_title} across "
            f"{', '.join(strengths_names)} with no outstanding role deficits."
        )
    else:
        obs = (
            f"{student_name} is configured for {role_title}. "
            f"Review required skills to begin personalized roadmap progression."
        )

    return {
        "interests": interests,
        "claimed_strengths": strengths,
        "selected_career": {
            "id": role_id,
            "title": role_title,
        },
        "main_skill_gaps": main_skill_gaps,
        "observation": obs,
    }
