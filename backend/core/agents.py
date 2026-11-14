"""
backend/core/agents.py - Specialized AI Agents and Lightweight Orchestrator.
Uses Gemini when configured; provides robust deterministic fallbacks when offline or LLM_DISABLED.
Every lifecycle stage is recorded in the agent_events database table.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from backend.config import settings
from backend.db import record_agent_event

logger = logging.getLogger(__name__)


def _call_gemini_json(prompt: str, system_instruction: str) -> Optional[Dict[str, Any]]:
    """Safe helper to call Gemini and parse JSON if enabled."""
    if settings.LLM_DISABLED or not settings.GEMINI_API_KEY:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
            ),
        )
        if response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
            return json.loads(cleaned)
    except Exception as e:
        logger.warning(f"Gemini agent call fallback due to: {type(e).__name__} ({e})")
        return None


# -------------------------------------------------------------
# 1. Profile Analyst Agent
# -------------------------------------------------------------
def run_profile_analyst(profile: Dict[str, Any], user_skills: Dict[str, Any]) -> Dict[str, Any]:
    p_id = profile.get("id", 1)
    record_agent_event(p_id, "Profile Analyst", "agent started", "Analyzing learner profile and claimed competencies.")

    strengths = [s for s, d in user_skills.items() if d.get("claimed_level", 0) >= 3]
    prompt = f"Student: {profile.get('name')}, Goal: {profile.get('goal')}, Interests: {profile.get('interests')}, Strengths: {strengths}"
    sys_prompt = "You are the Profile Analyst Agent. Return JSON: {'summary': str, 'interest_focus': str, 'strengths_highlight': list}."

    result = _call_gemini_json(prompt, sys_prompt)
    if result:
        record_agent_event(p_id, "Profile Analyst", "analysis completed", "Gemini profile interpretation generated.")
        return result

    # Deterministic fallback
    record_agent_event(p_id, "Profile Analyst", "fallback used", "Using deterministic profile intelligence heuristic.")
    return {
        "summary": f"{profile.get('name')} exhibits focused technical direction in {profile.get('goal', '').replace('_', ' ').title()}.",
        "interest_focus": profile.get("interests") or "Software engineering foundation",
        "strengths_highlight": strengths or ["python", "sql"],
    }


# -------------------------------------------------------------
# 2. Career Matcher Agent
# -------------------------------------------------------------
def run_career_matcher(
    profile: Dict[str, Any],
    role: Dict[str, Any],
    readiness: float,
    gaps: List[str]
) -> Dict[str, Any]:
    p_id = profile.get("id", 1)
    record_agent_event(p_id, "Career Matcher", "agent started", f"Evaluating alignment against target role '{role.get('title')}'.")

    prompt = f"Role: {role.get('title')}, Readiness: {readiness}%, Gaps: {gaps}"
    sys_prompt = "You are the Career Matcher Agent. Return JSON: {'alignment': str, 'fit_level': str, 'career_risks': list}."

    result = _call_gemini_json(prompt, sys_prompt)
    if result:
        record_agent_event(p_id, "Career Matcher", "analysis completed", "Gemini career alignment analysis completed.")
        return result

    # Deterministic fallback
    fit_level = "High" if readiness >= 70 else "Moderate" if readiness >= 40 else "Developing"
    record_agent_event(p_id, "Career Matcher", "fallback used", f"Applied deterministic career fit metric ({fit_level}).")
    return {
        "alignment": f"Student has demonstrated {readiness}% readiness for {role.get('title')}.",
        "fit_level": fit_level,
        "career_risks": [f"Missing prerequisite proficiency in {g}" for g in gaps[:3]],
    }


# -------------------------------------------------------------
# 3. Skill Auditor Agent
# -------------------------------------------------------------
def run_skill_auditor(
    profile_id: int,
    user_skills: Dict[str, Any],
    required_skills: Dict[str, int]
) -> Dict[str, Any]:
    record_agent_event(profile_id, "Skill Auditor", "agent started", "Auditing claimed ratings against verified assessment benchmarks.")

    unverified = [s for s, req in required_skills.items() if user_skills.get(s, {}).get("verified_level") is None]
    verified_gaps = [
        s for s, req in required_skills.items()
        if user_skills.get(s, {}).get("verified_level") is not None
        and user_skills[s]["verified_level"] < req
    ]

    prompt = f"Unverified skills: {unverified}, Verified deficits: {verified_gaps}"
    sys_prompt = "You are the Skill Auditor Agent. Return JSON: {'audit_verdict': str, 'verification_risk': str, 'priority_audits': list}."

    result = _call_gemini_json(prompt, sys_prompt)
    if result:
        record_agent_event(profile_id, "Skill Auditor", "analysis completed", "Gemini skill audit complete.")
        return result

    record_agent_event(profile_id, "Skill Auditor", "fallback used", "Audited verified coverage using transparent scoring rules.")
    risk = "High" if len(unverified) >= 4 else "Moderate" if unverified else "Low"
    return {
        "audit_verdict": f"{len(unverified)} role competencies currently lack empirical assessment verification.",
        "verification_risk": risk,
        "priority_audits": unverified[:3],
    }


# -------------------------------------------------------------
# 4. Weakness Detective Agent
# -------------------------------------------------------------
def run_weakness_detective(profile_id: int, weakness_data: Dict[str, Any]) -> Dict[str, Any]:
    record_agent_event(profile_id, "Weakness Detective", "agent started", "Investigating telemetry response times, error patterns, and difficulty levels.")

    signals = weakness_data.get("signals", [])
    prompt = f"Diagnostic telemetry signals: {signals}"
    sys_prompt = (
        "You are the Weakness Detective Agent. Explain the likely root-cause heuristics (careless errors vs conceptual gaps). "
        "Return JSON: {'root_cause_summary': str, 'careless_risk': str, 'conceptual_gaps': list, 'actionable_heuristic': str}."
    )

    result = _call_gemini_json(prompt, sys_prompt)
    if result:
        record_agent_event(profile_id, "Weakness Detective", "analysis completed", "Gemini diagnostic weakness synthesis generated.")
        return result

    record_agent_event(profile_id, "Weakness Detective", "fallback used", "Generated deterministic diagnostic heuristics from question telemetry.")
    careless_count = sum(1 for s in signals if s.get("type") == "careless_error")
    conceptual_count = sum(1 for s in signals if s.get("type") == "conceptual_weakness")
    persistent_gaps = [s.get("skill_id") for s in signals if s.get("type") == "persistent_knowledge_gap"]

    return {
        "root_cause_summary": f"Detected {careless_count} fast careless lapse(s) and {conceptual_count} deep conceptual struggle(s).",
        "careless_risk": "Elevated" if careless_count > 0 else "Low",
        "conceptual_gaps": persistent_gaps or ["Foundational syntax and async event loops"],
        "actionable_heuristic": "Review runtime mechanics and deliberate on code tracing before selecting answer options.",
    }


# -------------------------------------------------------------
# 5. Curriculum Planner Agent
# -------------------------------------------------------------
def run_curriculum_planner(
    profile_id: int,
    roadmap_modules: List[Dict[str, Any]],
    role_title: str
) -> Dict[str, Any]:
    record_agent_event(profile_id, "Curriculum Planner", "agent started", f"Sequencing learning modules for {role_title}.")

    active_mods = [m["skill_name"] for m in roadmap_modules if m.get("status") == "active"]
    locked_mods = [m["skill_name"] for m in roadmap_modules if m.get("status") == "locked"]

    prompt = f"Active modules: {active_mods}, Locked: {locked_mods}, Role: {role_title}"
    sys_prompt = "You are the Curriculum Planner Agent. Return JSON: {'plan_overview': str, 'immediate_focus': list, 'prerequisite_rationale': str}."

    result = _call_gemini_json(prompt, sys_prompt)
    if result:
        record_agent_event(profile_id, "Curriculum Planner", "roadmap updated", "AI-optimized curriculum rationale generated.")
        return result

    record_agent_event(profile_id, "Curriculum Planner", "fallback used", "Sequenced roadmap according to topological DAG dependencies.")
    return {
        "plan_overview": f"Curriculum strictly ordered by prerequisite dependency graph for {role_title}.",
        "immediate_focus": active_mods[:2],
        "prerequisite_rationale": "Foundational modules must be mastered before unlocking framework and runtime abstractions.",
    }


# -------------------------------------------------------------
# 6. AI Mentor Agent (On-Demand)
# -------------------------------------------------------------
def run_mentor_agent(
    profile_id: int,
    user_query: str,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    record_agent_event(profile_id, "AI Mentor", "agent started", f"Responding to student inquiry: '{user_query[:50]}...'")

    prompt = f"Student Query: '{user_query}', Context: {context}"
    sys_prompt = (
        "You are QUANTA AI Mentor, an empathetic senior placement coach. "
        "Return JSON: {'advice': str, 'next_step': str, 'encouragement': str}."
    )

    result = _call_gemini_json(prompt, sys_prompt)
    if result:
        record_agent_event(profile_id, "AI Mentor", "analysis completed", "Personalized mentor guidance delivered.")
        return result

    record_agent_event(profile_id, "AI Mentor", "fallback used", "Delivered deterministic contextual coaching advice.")
    return {
        "advice": (
            "Focus 70% of study time on active roadmap modules with verified gaps. "
            "Write code by hand and explain execution flow aloud to solidify async mental models."
        ),
        "next_step": "Complete the active JavaScript module and review MDN guide resources.",
        "encouragement": "Every completed module directly elevates your placement readiness percentage!",
    }


# -------------------------------------------------------------
# Lightweight Orchestrator
# -------------------------------------------------------------
def orchestrate_career_intelligence(
    profile: Dict[str, Any],
    role: Dict[str, Any],
    user_skills: Dict[str, Any],
    gap_report: Dict[str, Any],
    roadmap_modules: List[Dict[str, Any]],
    weakness_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Coordinates multi-agent collaboration:
    - Runs Career Matcher & Skill Auditor in tandem
    - Reconciles conflicts if high fit claimed but high unverified risk detected
    - Triggers Weakness Detective when assessment data is present
    - Triggers Curriculum Planner to contextualize roadmap
    """
    p_id = profile.get("id", 1)
    readiness = gap_report.get("readiness", 0.0)
    gap_skills = gap_report.get("gap_skills", [])

    # Parallel/Independent execution
    matcher_res = run_career_matcher(profile, role, readiness, gap_skills)
    auditor_res = run_skill_auditor(p_id, user_skills, role.get("required_skills", {}))

    # Conflict detection & reconciliation
    reconciliation = None
    if matcher_res.get("fit_level") in ("High", "Moderate") and auditor_res.get("verification_risk") == "High":
        record_agent_event(
            p_id, "Orchestrator", "conflict detected",
            "Discrepancy: Career Matcher reported optimistic readiness while Skill Auditor flagged unverified claims."
        )
        reconciliation = {
            "conflict": "Claimed readiness is high, but empirical assessment verification coverage is low.",
            "resolution": "Conditional recommendation: Prioritize immediate technical assessment before formal interview referrals.",
        }
        record_agent_event(p_id, "Orchestrator", "reconciliation completed", reconciliation["resolution"])

    # Weakness Detective (only if assessment evidence exists)
    weakness_res = None
    if weakness_data and weakness_data.get("signals"):
        weakness_res = run_weakness_detective(p_id, weakness_data)

    # Curriculum Planner
    planner_res = run_curriculum_planner(p_id, roadmap_modules, role.get("title", ""))

    return {
        "career_matcher": matcher_res,
        "skill_auditor": auditor_res,
        "reconciliation": reconciliation,
        "weakness_detective": weakness_res,
        "curriculum_planner": planner_res,
    }
