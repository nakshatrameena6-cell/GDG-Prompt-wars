"""
backend/core/gap.py - Pure functions for skill gap analysis and telemetry.

This module provides deterministic mathematical functions for evaluating student skill
readiness, effective competency levels, and verification coverage without any network I/O
or external LLM dependencies.
"""

from typing import Dict, Any, Optional, List, TypedDict


class GapItem(TypedDict):
    """Represents an itemized skill evaluation against a career requirement."""
    skill_id: str
    skill_name: str
    category: str
    claimed: int
    verified: Optional[int]
    effective: int
    required: int
    gap: int
    fulfilled: bool


class GapReport(TypedDict):
    """Aggregate skill gap and readiness evaluation report."""
    items: List[GapItem]
    gap_skills: List[str]
    readiness: float
    verification_coverage: float


def calculate_effective_level(claimed_level: int, verified_level: Optional[int] = None) -> int:
    """
    Calculates the student's effective skill level.

    The verified assessment score takes precedence when present; otherwise, the claimed
    self-rating is utilized. Clamps unrated or missing values to 0.

    Args:
        claimed_level: Self-reported skill level (1-5, or 0 if unrated).
        verified_level: Optional objective assessment score (1-5).

    Returns:
        int: Effective competency level (0-5).
    """
    if verified_level is not None:
        return verified_level
    return claimed_level if claimed_level is not None else 0


def calculate_gap(effective_level: int, required_level: int) -> int:
    """
    Calculates the numeric deficit between effective level and target requirement.

    Args:
        effective_level: Current effective skill level.
        required_level: Minimum required skill level for the target role.

    Returns:
        int: Deficit amount, or 0 if effective level meets or exceeds requirement.
    """
    return max(0, required_level - effective_level)


def calculate_readiness(
    required_skills: Dict[str, int],
    user_skills: Dict[str, Dict[str, Any]]
) -> float:
    """
    Computes overall readiness percentage against a target role requirement.

    Weighted mathematically by required levels:
        readiness % = (sum(min(effective, required)) / sum(required)) * 100.0

    Args:
        required_skills: Mapping of skill IDs to required mastery levels.
        user_skills: Mapping of skill IDs to student skill profiles.

    Returns:
        float: Rounded readiness score clamped between 0.0 and 100.0%.
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
    Calculates the percentage of role-required skills verified via objective assessment.

    Args:
        required_skills: Mapping of skill IDs to required mastery levels.
        user_skills: Mapping of skill IDs to student skill profiles.

    Returns:
        float: Verified skill coverage percentage (0.0 to 100.0%).
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
) -> GapReport:
    """
    Produces full gap analysis report across all role-required skills.

    Args:
        required_skills: Mapping of skill IDs to required mastery levels.
        user_skills: Mapping of skill IDs to student skill profiles.
        skills_catalog: Optional catalogue metadata for human-readable skill names.

    Returns:
        GapReport: Itemized breakdown, outstanding gap skills, readiness %, and verification coverage.
    """
    skills_map = {s["id"]: s for s in (skills_catalog or [])}
    items: List[GapItem] = []
    gap_skills: List[str] = []

    for skill_id, req_level in required_skills.items():
        u_skill = user_skills.get(skill_id, {})
        claimed = u_skill.get("claimed_level", 0)
        verified = u_skill.get("verified_level")
        eff = calculate_effective_level(claimed, verified)
        gap = calculate_gap(eff, req_level)

        skill_info = skills_map.get(skill_id, {})
        skill_name = skill_info.get("name", skill_id.replace("_", " ").title())

        item: GapItem = {
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
