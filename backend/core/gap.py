"""
backend/core/gap.py - Pure functions for skill gap analysis and telemetry.
Zero I/O.
"""

from typing import Dict, Any, Optional, List


def calculate_effective_level(claimed_level: int, verified_level: Optional[int] = None) -> int:
    """
    Calculates the student's effective skill level.
    If a verified assessment score exists, it takes precedence.
    Otherwise, the claimed rating is used.
    """
    if verified_level is not None:
        return verified_level
    return claimed_level if claimed_level is not None else 0


def calculate_gap(effective_level: int, required_level: int) -> int:
    """
    Calculates the gap between effective level and required level.
    Returns 0 if effective level meets or exceeds requirement.
    """
    return max(0, required_level - effective_level)


def calculate_readiness(
    required_skills: Dict[str, int],
    user_skills: Dict[str, Dict[str, Any]]
) -> float:
    """
    Computes overall readiness percentage against a target role requirement.
    Weighted by required levels: sum(min(effective, required)) / sum(required) * 100.
    Clamped to 0.0 - 100.0%.
    """
    if not required_skills:
        return 100.0

    total_required = sum(required_skills.values())
    if total_required == 0:
        return 100.0

    total_met = 0
    for skill_id, req_level in required_skills.items():
        u_skill = user_skills.get(skill_id, {})
        claimed = u_skill.get("claimed_level", 0)
        verified = u_skill.get("verified_level")
        eff = calculate_effective_level(claimed, verified)
        total_met += min(eff, req_level)

    readiness = (total_met / total_required) * 100.0
    return round(readiness, 1)


def calculate_verification_coverage(
    required_skills: Dict[str, int],
    user_skills: Dict[str, Dict[str, Any]]
) -> float:
    """
    Calculates the percentage of role-required skills that have a verified rating.
    """
    if not required_skills:
        return 0.0

    total_skills = len(required_skills)
    verified_count = 0
    for skill_id in required_skills:
        u_skill = user_skills.get(skill_id, {})
        if u_skill.get("verified_level") is not None:
            verified_count += 1

    return round((verified_count / total_skills) * 100.0, 1)


def analyze_gaps(
    required_skills: Dict[str, int],
    user_skills: Dict[str, Dict[str, Any]],
    skills_catalog: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Produces full gap analysis report across all role-required skills.
    Returns itemized breakdown, gap list, readiness %, and verification coverage.
    """
    skills_map = {s["id"]: s for s in (skills_catalog or [])}
    items = []
    gap_skills = []

    for skill_id, req_level in required_skills.items():
        u_skill = user_skills.get(skill_id, {})
        claimed = u_skill.get("claimed_level", 0)
        verified = u_skill.get("verified_level")
        eff = calculate_effective_level(claimed, verified)
        gap = calculate_gap(eff, req_level)

        skill_info = skills_map.get(skill_id, {})
        skill_name = skill_info.get("name", skill_id.replace("_", " ").title())

        item = {
            "skill_id": skill_id,
            "skill_name": skill_name,
            "category": skill_info.get("category", "General"),
            "claimed": claimed,
            "verified": verified,
            "effective": eff,
            "required": req_level,
            "gap": gap,
            "fulfilled": gap == 0,
        }
        items.append(item)
        if gap > 0:
            gap_skills.append(skill_id)

    readiness = calculate_readiness(required_skills, user_skills)
    coverage = calculate_verification_coverage(required_skills, user_skills)

    return {
        "items": items,
        "gap_skills": gap_skills,
        "readiness": readiness,
        "verification_coverage": coverage,
    }

