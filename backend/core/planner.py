"""
backend/core/planner.py - Pure functions for roadmap planning and goal transitions.
Zero I/O.
"""

from typing import Dict, Any, List, Set, Optional
from backend.core.gap import calculate_effective_level, calculate_readiness


def topological_sort_skills(
    skills_subset: Set[str],
    prereq_map: Dict[str, List[str]]
) -> List[str]:
    """
    Performs deterministic topological sorting for a subset of skills.
    Prerequisites must precede the skills that depend on them.
    Ties broken alphabetically for stability.
    """
    in_degree = {s: 0 for s in skills_subset}
    dependents = {s: [] for s in skills_subset}

    for skill_id in skills_subset:
        prereqs = prereq_map.get(skill_id, [])
        for p in prereqs:
            if p in skills_subset:
                dependents[p].append(skill_id)
                in_degree[skill_id] += 1

    queue = sorted([s for s, deg in in_degree.items() if deg == 0])
    ordered = []

    while queue:
        curr = queue.pop(0)
        ordered.append(curr)

        next_candidates = []
        for dep in dependents.get(curr, []):
            in_degree[dep] -= 1
            if in_degree[dep] == 0:
                next_candidates.append(dep)

        for cand in sorted(next_candidates):
            queue.append(cand)
        queue.sort()

    for s in sorted(skills_subset):
        if s not in ordered:
            ordered.append(s)

    return ordered


def generate_roadmap(
    role_id: str,
    role_title: str,
    required_skills: Dict[str, int],
    skills_catalog: List[Dict[str, Any]],
    resources_catalog: List[Dict[str, Any]],
    user_skills: Dict[str, Dict[str, Any]],
    completed_skill_ids: Set[str]
) -> List[Dict[str, Any]]:
    """
    Generates an adaptive sequenced roadmap of modules for a role and learner state.
    Prioritizes verified skill deficits, preserves completed progress, and strictly selects
    from curated resources.json.
    """
    skills_map = {s["id"]: s for s in skills_catalog}
    prereq_map = {s["id"]: s.get("prerequisites", []) for s in skills_catalog}

    # Group resources by skill
    resource_map: Dict[str, List[Dict[str, Any]]] = {}
    for r in resources_catalog:
        s_id = r["skill_id"]
        resource_map.setdefault(s_id, []).append(r)

    # Sort each skill's resources by level
    for s_id in resource_map:
        resource_map[s_id].sort(key=lambda x: x.get("level", 1))

    # Topologically sort role-required skills
    role_skill_keys = set(required_skills.keys())
    ordered_skill_ids = topological_sort_skills(role_skill_keys, prereq_map)

    # First pass: determine which skills are currently 'done'
    done_skills = set(completed_skill_ids)
    for s_id in role_skill_keys:
        req = required_skills[s_id]
        u = user_skills.get(s_id, {})
        eff = calculate_effective_level(u.get("claimed_level", 0), u.get("verified_level"))
        if eff >= req:
            done_skills.add(s_id)

    # Second pass: construct module entries with status active/locked/done and adaptive priority
    roadmap_modules = []
    for order_idx, s_id in enumerate(ordered_skill_ids):
        req_level = required_skills[s_id]
        u = user_skills.get(s_id, {})
        claimed_lvl = u.get("claimed_level", 0)
        verified_lvl = u.get("verified_level")
        eff = calculate_effective_level(claimed_lvl, verified_lvl)
        gap = max(0, req_level - eff)

        s_info = skills_map.get(s_id, {})
        skill_name = s_info.get("name", s_id.replace("_", " ").title())
        prereqs = s_info.get("prerequisites", [])

        if s_id in done_skills:
            status = "done"
        else:
            # Check if all prerequisites are fulfilled
            prereqs_met = True
            for p in prereqs:
                if p in role_skill_keys:
                    if p not in done_skills:
                        prereqs_met = False
                        break
                else:
                    p_eff = calculate_effective_level(
                        user_skills.get(p, {}).get("claimed_level", 0),
                        user_skills.get(p, {}).get("verified_level")
                    )
                    if p not in completed_skill_ids and p_eff < 1:
                        prereqs_met = False
                        break

            status = "active" if prereqs_met else "locked"

        # Adaptive priority and rationale
        if verified_lvl is not None and verified_lvl < req_level:
            priority = "HIGH"
            why_text = f"CRITICAL DEFICIT: Verified at Level {verified_lvl} vs Required Level {req_level}. Immediate remediation required for {role_title}."
        elif gap > 0:
            priority = "MEDIUM"
            why_text = f"Master {skill_name} (Level {req_level}) to build essential proficiency for {role_title}."
        else:
            priority = "LOW"
            why_text = f"Core competency fulfilled for {role_title}."

        matching_resources = resource_map.get(s_id, [])
        recommended_resource = matching_resources[0] if matching_resources else None

        module = {
            "id": f"mod-{role_id}-{s_id}",
            "skill_id": s_id,
            "skill_name": skill_name,
            "category": s_info.get("category", "General"),
            "required_level": req_level,
            "claimed_level": claimed_lvl,
            "verified_level": verified_lvl,
            "effective_level": eff,
            "gap": gap,
            "priority": priority,
            "status": status,
            "prerequisites": prereqs,
            "why": why_text,
            "resources": matching_resources,
            "recommended_resource": recommended_resource,
            "order": order_idx + 1,
        }
        roadmap_modules.append(module)

    return roadmap_modules


def diff_goals(
    current_goal_skills: Dict[str, int],
    new_goal_skills: Dict[str, int],
    user_skills: Dict[str, Dict[str, Any]],
    completed_skill_ids: Optional[Set[str]] = None,
    current_role_title: str = "Previous Role",
    new_role_title: str = "Target Role"
) -> Dict[str, Any]:
    """
    Computes intelligent diff when previewing or changing target career goals.
    Explains the transition rationale and preserves achievements for overlapping skills.
    """
    cur_keys = set(current_goal_skills.keys())
    new_keys = set(new_goal_skills.keys())

    kept = sorted(list(cur_keys & new_keys))
    added = sorted(list(new_keys - cur_keys))
    removed = sorted(list(cur_keys - new_keys))

    readiness_before = calculate_readiness(current_goal_skills, user_skills)
    readiness_after = calculate_readiness(new_goal_skills, user_skills)

    explanation = (
        f"Switching from {current_role_title} to {new_role_title}: "
        f"Preserved {len(kept)} shared core competencies ({', '.join(kept[:3])}). "
        f"Added {len(added)} new domain requirements ({', '.join(added[:3])}), and "
        f"de-prioritized {len(removed)} role-specific skills."
    )

    return {
        "kept_skills": kept,
        "added_skills": added,
        "removed_skills": removed,
        "readiness_before": readiness_before,
        "readiness_after": readiness_after,
        "explanation": explanation,
    }
