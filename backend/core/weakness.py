"""
backend/core/weakness.py - Deterministic diagnostic heuristics and verified skill calculation.

Provides pure functions for root-cause analysis, time-budget error diagnosis, and
evidence-backed verified skill rating with zero I/O and zero LLM calls.
"""

from typing import Dict, Any, List, Optional, TypedDict

# Diagnostic heuristic thresholds
FAST_THRESHOLD_SECONDS = 8.5

# Diagnostic signal types
SIGNAL_DEMONSTRATED_PROFICIENCY = "demonstrated_proficiency"
SIGNAL_CARELESS_ERROR = "careless_error"
SIGNAL_CONCEPTUAL_WEAKNESS = "conceptual_weakness"
SIGNAL_PERSISTENT_GAP = "persistent_knowledge_gap"


class DiagnosticSignal(TypedDict, total=False):
    """Represents a discrete diagnostic signal detected during technical assessment."""
    type: str
    skill_id: str
    difficulty: str
    time_taken: float
    error_tag: str
    heuristic: str
    error_count: int


class SkillDiagnostics(TypedDict):
    """Aggregated response statistics for a single skill."""
    total: int
    correct: int
    errors: List[Dict[str, Any]]
    careless_errors: int
    conceptual_errors: int
    hard_correct: int


class WeaknessAnalysisReport(TypedDict):
    """Full diagnostic weakness analysis report across all evaluated responses."""
    signals: List[Dict[str, Any]]
    skill_stats: Dict[str, Dict[str, Any]]
    verified_levels: Dict[str, Optional[int]]


def calculate_verified_skill_level(
    skill_responses: List[Dict[str, Any]]
) -> Optional[int]:
    """
    Transparent scoring rule for verified skill level:
    - 0 questions attempted -> None (Unverified)
    - 100% correct (with HARD passed) -> Level 5 (Mastery)
    - 100% correct (without HARD) -> Level 4 (Proficient)
    - 65% - 99% correct -> Level 3 (Working Competency)
    - 30% - 64% correct -> Level 2 (Novice)
    - < 30% correct -> Level 1 (Foundational Deficit)

    Args:
        skill_responses: List of recorded response telemetry for a skill.

    Returns:
        Optional[int]: Verified skill rating (1-5), or None if unassessed.
    """
    if not skill_responses:
        return None

    total = len(skill_responses)
    correct_count = sum(1 for r in skill_responses if r.get("is_correct"))
    accuracy = correct_count / total if total > 0 else 0

    has_hard_correct = any(
        r.get("is_correct") and r.get("difficulty") == "HARD"
        for r in skill_responses
    )

    if accuracy >= 1.0:
        return 5 if has_hard_correct else 4
    elif accuracy >= 0.65:
        return 3
    elif accuracy >= 0.30:
        return 2
    else:
        return 1


def analyze_weakness_heuristics(
    responses: List[Dict[str, Any]],
    skills_map: Optional[Dict[str, Any]] = None
) -> WeaknessAnalysisReport:
    """
    Extracts root-cause diagnostic signals from assessment responses:
    - Fast (< 8.5s) + incorrect -> possible careless error / hasty execution
    - Slow (>= 8.5s) + incorrect -> conceptual weakness requiring foundational study
    - Repeated errors on same skill -> persistent knowledge gap
    - Correct answers on HARD difficulty -> demonstrated high-tier proficiency

    Args:
        responses: Array of submitted assessment question responses with telemetry.
        skills_map: Optional mapping of skill metadata.

    Returns:
        WeaknessAnalysisReport: Detected diagnostic signals, per-skill stats, and verified levels.
    """
    skills_map = skills_map or {}
    skill_stats: Dict[str, Dict[str, Any]] = {}
    diagnostic_signals: List[Dict[str, Any]] = []

    for r in responses:
        skill_id = r.get("skill_id", "general")
        is_correct = bool(r.get("is_correct"))
        time_taken = float(r.get("response_time", 10.0))
        difficulty = r.get("difficulty", "MEDIUM")
        error_tag = r.get("error_tag") or "general_error"
        question_text = r.get("question", "")

        if skill_id not in skill_stats:
            skill_stats[skill_id] = {
                "total": 0,
                "correct": 0,
                "errors": [],
                "careless_errors": 0,
                "conceptual_errors": 0,
                "hard_correct": 0,
            }

        stats = skill_stats[skill_id]
        stats["total"] += 1

        if is_correct:
            stats["correct"] += 1
            if difficulty == "HARD":
                stats["hard_correct"] += 1
                diagnostic_signals.append({
                    "type": SIGNAL_DEMONSTRATED_PROFICIENCY,
                    "skill_id": skill_id,
                    "difficulty": difficulty,
                    "heuristic": "Strong demonstrated proficiency under advanced problem constraints.",
                })
        else:
            stats["errors"].append({
                "question": question_text,
                "time_taken": time_taken,
                "difficulty": difficulty,
                "error_tag": error_tag,
            })
            if time_taken < FAST_THRESHOLD_SECONDS:
                stats["careless_errors"] += 1
                diagnostic_signals.append({
                    "type": SIGNAL_CARELESS_ERROR,
                    "skill_id": skill_id,
                    "difficulty": difficulty,
                    "time_taken": time_taken,
                    "error_tag": error_tag,
                    "heuristic": "Fast response under threshold resulting in error. Suggests possible careless execution or overlooking edge-case conditions.",
                })
            else:
                stats["conceptual_errors"] += 1
                diagnostic_signals.append({
                    "type": SIGNAL_CONCEPTUAL_WEAKNESS,
                    "skill_id": skill_id,
                    "difficulty": difficulty,
                    "time_taken": time_taken,
                    "error_tag": error_tag,
                    "heuristic": "Prolonged response time resulting in incorrect deduction. Suggests conceptual gap requiring deliberate study.",
                })

    # Detect persistent knowledge gaps (2 or more errors in same skill)
    for s_id, s_info in skill_stats.items():
        if len(s_info["errors"]) >= 2:
            diagnostic_signals.append({
                "type": SIGNAL_PERSISTENT_GAP,
                "skill_id": s_id,
                "error_count": len(s_info["errors"]),
                "heuristic": f"Repeated incorrect answers ({len(s_info['errors'])} errors) in {s_id}. Indicates persistent core competency deficit.",
            })

    # Summary by skill
    verified_levels: Dict[str, Optional[int]] = {}
    for s_id, s_info in skill_stats.items():
        skill_resps = [r for r in responses if r.get("skill_id") == s_id]
        verified_levels[s_id] = calculate_verified_skill_level(skill_resps)

    return {
        "signals": diagnostic_signals,
        "skill_stats": skill_stats,
        "verified_levels": verified_levels,
    }
