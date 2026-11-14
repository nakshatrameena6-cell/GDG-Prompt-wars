import pytest
from backend.core.gap import (
    calculate_effective_level,
    calculate_gap,
    calculate_readiness,
    calculate_verification_coverage,
    analyze_gaps,
)


def test_effective_level():
    # If verified is None, returns claimed
    assert calculate_effective_level(claimed_level=3, verified_level=None) == 3
    # If verified is present, returns verified
    assert calculate_effective_level(claimed_level=4, verified_level=2) == 2
    # If claimed is None and verified is None, returns 0
    assert calculate_effective_level(claimed_level=None, verified_level=None) == 0


def test_calculate_gap():
    # Gap exists when effective < required
    assert calculate_gap(effective_level=1, required_level=3) == 2
    assert calculate_gap(effective_level=0, required_level=4) == 4
    # Gap is 0 when effective >= required
    assert calculate_gap(effective_level=3, required_level=3) == 0
    assert calculate_gap(effective_level=5, required_level=3) == 0


def test_readiness_calculation():
    required = {
        "javascript": 3,
        "react": 3,
        "nodejs": 3,
        "rest_api": 3,
        "html_css": 2,
        "sql": 3,
        "git": 2,
        "python": 3,
    }
    # Sample student: Python 3, SQL 3, html_css 2
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": None},
        "sql": {"claimed_level": 3, "verified_level": None},
        "html_css": {"claimed_level": 2, "verified_level": None},
    }
    readiness = calculate_readiness(required, user_skills)
    # Total required = 22, total met = 8 -> 8 / 22 = 36.36% -> 36.4%
    assert 20 <= readiness <= 60
    assert readiness == 36.4

    # Empty required skills edge case
    assert calculate_readiness({}, user_skills) == 100.0


def test_verification_coverage():
    required = {"python": 3, "sql": 3, "javascript": 3}
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": 3},
        "sql": {"claimed_level": 3, "verified_level": None},
    }
    # 1 of 3 required skills has verified rating -> 33.3%
    coverage = calculate_verification_coverage(required, user_skills)
    assert coverage == 33.3

    assert calculate_verification_coverage({}, user_skills) == 0.0


def test_analyze_gaps_sample_student():
    required = {
        "javascript": 3,
        "react": 3,
        "nodejs": 3,
        "rest_api": 3,
        "html_css": 2,
        "sql": 3,
        "git": 2,
        "python": 3,
    }
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": None},
        "sql": {"claimed_level": 3, "verified_level": None},
        "html_css": {"claimed_level": 2, "verified_level": None},
    }
    result = analyze_gaps(required, user_skills)

    # Gaps include javascript, react, nodejs, rest_api
    for skill in ["javascript", "react", "nodejs", "rest_api"]:
        assert skill in result["gap_skills"]

    # Gaps exclude python and sql
    assert "python" not in result["gap_skills"]
    assert "sql" not in result["gap_skills"]
    assert "html_css" not in result["gap_skills"]

    assert 20 <= result["readiness"] <= 60
    assert result["verification_coverage"] == 0.0
