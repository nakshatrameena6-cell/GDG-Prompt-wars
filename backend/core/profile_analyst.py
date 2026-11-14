"""
backend/core/profile_analyst.py - Deterministic Profile Analyst foundation.
Pure functions with zero I/O and zero LLM calls.
Easily swappable with Gemini-powered agent in Phase 2/3.
"""

from typing import Dict, Any, List, Optional
from backend.core.gap import calculate_effective_level

DEFAULT_ROLE_INTERESTS = {
    "full_stack_developer": "Full-stack web architecture, API engineering, relational databases",
    "data_analyst": "Data analysis, tabular data manipulation, exploratory visualization, SQL",
    "frontend_developer": "Modern UI/UX components, client-side state management, responsive design",
}


def generate_profile_summary(
    profile: Dict[str, Any],
    role: Dict[str, Any],
    user_skills: Dict[str, Dict[str, Any]],
    gap_report: Dict[str, Any],
    skills_catalog: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates a deterministic profile summary based strictly on existing learner data.
    Does not fabricate assessment results, verified skill levels, or LLM output.
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
    strengths = []
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

    main_skill_gaps = [
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
