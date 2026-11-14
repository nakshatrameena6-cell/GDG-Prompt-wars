import pytest
from fastapi.testclient import TestClient

from backend.main import app, TECHNICAL_QUESTIONS
from backend.db import count_db_rows, get_user_skills, get_agent_events, get_default_profile

client = TestClient(app)


@pytest.fixture(autouse=True)
def run_around_tests():
    client.post("/api/demo/seed")
    yield


def test_technical_questions_sanitized():
    """Verify technical questions are returned and do not expose the answer key."""
    res = client.get("/api/assessment/questions")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] == 15
    for q in data["questions"]:
        assert "answer" not in q
        assert "correct_option" not in q
        assert "question" in q
        assert len(q["options"]) == 4
        assert q["skill_id"] in ["javascript", "react", "nodejs", "python", "sql"]


def test_assessment_scoring_and_verified_skills():
    """
    Verify:
    - Answers scored deterministically on backend
    - Verified levels calculated from actual assessment results
    - Unassessed skills remain unverified (None)
    """
    # Build answers for 3 JavaScript questions (2 correct, 1 incorrect)
    # and 3 Python questions (all 3 correct)
    js_questions = [q for q in TECHNICAL_QUESTIONS if q["skill_id"] == "javascript"]
    py_questions = [q for q in TECHNICAL_QUESTIONS if q["skill_id"] == "python"]

    responses = [
        # JS: 1 correct fast (5.0s)
        {
            "question_id": js_questions[0]["id"],
            "skill_id": "javascript",
            "selected_option": js_questions[0]["answer"],
            "response_time": 5.0,
            "difficulty": js_questions[0]["difficulty"],
            "error_tag": js_questions[0].get("error_tag"),
        },
        # JS: 1 correct slow (12.0s)
        {
            "question_id": js_questions[1]["id"],
            "skill_id": "javascript",
            "selected_option": js_questions[1]["answer"],
            "response_time": 12.0,
            "difficulty": js_questions[1]["difficulty"],
            "error_tag": js_questions[1].get("error_tag"),
        },
        # JS: 1 wrong fast (4.0s) -> careless error
        {
            "question_id": js_questions[2]["id"],
            "skill_id": "javascript",
            "selected_option": (js_questions[2]["answer"] + 1) % 4,
            "response_time": 4.0,
            "difficulty": js_questions[2]["difficulty"],
            "error_tag": js_questions[2].get("error_tag"),
        },
        # Python: 3 correct
        *[
            {
                "question_id": q["id"],
                "skill_id": "python",
                "selected_option": q["answer"],
                "response_time": 6.0,
                "difficulty": q["difficulty"],
                "error_tag": q.get("error_tag"),
            }
            for q in py_questions
        ]
    ]

    res = client.post("/api/assessment/submit", json={"responses": responses})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["score"] == 5  # 2 JS + 3 Python
    assert data["total"] == 6

    # Verified levels in DB
    prof = get_default_profile()
    skills = get_user_skills(prof["id"])

    # JavaScript was assessed: 2/3 correct -> verified level = 3
    assert skills["javascript"]["verified_level"] == 3

    # Python was assessed: 3/3 correct with HARD -> verified level >= 4
    assert skills["python"]["verified_level"] >= 4

    # React and Node.js were not assessed: must remain unverified!
    assert skills.get("react", {}).get("verified_level") is None
    assert skills.get("nodejs", {}).get("verified_level") is None

    # Weakness analysis contains careless error heuristic for JS
    weakness = data["weakness_analysis"]
    careless = [s for s in weakness["signals"] if s["type"] == "careless_error"]
    assert len(careless) >= 1
    assert careless[0]["skill_id"] == "javascript"


def test_adaptive_roadmap_reflects_assessment():
    """Verify that assessment results update the roadmap with priority and verified levels."""
    js_questions = [q for q in TECHNICAL_QUESTIONS if q["skill_id"] == "javascript"]
    # Fail all JavaScript questions deliberately
    responses = [
        {
            "question_id": q["id"],
            "skill_id": "javascript",
            "selected_option": (q["answer"] + 1) % 4,
            "response_time": 15.0,  # Slow -> conceptual error
            "difficulty": q["difficulty"],
            "error_tag": q.get("error_tag"),
        }
        for q in js_questions
    ]

    res = client.post("/api/assessment/submit", json={"responses": responses})
    assert res.status_code == 200
    state = res.json()["state"]

    js_module = next(m for m in state["roadmap"] if m["skill_id"] == "javascript")
    assert js_module["verified_level"] == 1
    assert js_module["priority"] == "HIGH"
    assert "CRITICAL DEFICIT" in js_module["why"]


def test_intelligent_career_switch_to_ml_engineer():
    """
    Verify:
    - Preview to ml_engineer does not mutate database
    - Goal switch persists ml_engineer
    - Overlapping skills (python, sql, git) preserve levels and completion
    - Transition explanation is returned
    """
    # 1. Complete git in full_stack_developer
    client.post("/api/modules/git/complete")

    counts_before = count_db_rows()

    # 2. Preview ml_engineer
    res_prev = client.post("/api/goal/preview", json={"goal": "ml_engineer"})
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["status"] == "success"
    assert "explanation" in prev_data
    assert "machine_learning" in prev_data["added_skills"]
    assert "javascript" in prev_data["removed_skills"]

    # Preview must NOT mutate DB
    assert count_db_rows() == counts_before

    # 3. Confirm goal switch to ml_engineer
    res_goal = client.post("/api/goal", json={"goal": "ml_engineer"})
    assert res_goal.status_code == 200
    state = res_goal.json()
    assert state["profile"]["goal"] == "ml_engineer"
    assert state["role"]["id"] == "ml_engineer"

    # Git was completed, must still be done!
    git_mod = next(m for m in state["roadmap"] if m["skill_id"] == "git")
    assert git_mod["status"] == "done"


def test_agent_activity_timeline_persisted():
    """Verify that real agent execution events are recorded and retrieved."""
    res = client.get("/api/agents/timeline")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] > 0
    agents_recorded = {e["agent_name"] for e in data["events"]}
    assert "Orchestrator" in agents_recorded or "Career Matcher" in agents_recorded


def test_mentor_chat():
    """Verify on-demand AI Mentor endpoint returns advice."""
    res = client.post("/api/mentor/chat", json={"query": "How do I prepare for React?"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "mentor_response" in data
    assert "advice" in data["mentor_response"]


def test_progress_tracking():
    """Verify progress tracking endpoint returns assessment history."""
    res = client.get("/api/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "assessment_history" in data
    assert "current_skills" in data
