import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.db import count_db_rows, reset_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def run_around_tests():
    # Before each test, seed fresh sample student
    client.post("/api/demo/seed")
    yield


def test_health_check():
    """Test health check endpoints."""
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_root = client.get("/health")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "healthy"


def test_catalog_endpoint():
    """Test /catalog returns roles, skills, and resources."""
    res = client.get("/api/catalog")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["roles"]) >= 3
    assert len(data["skills"]) == 15
    assert len(data["resources"]) >= 30


def test_sample_student_acceptance():
    """
    Acceptance criteria:
    - Sample student: gaps include javascript, react, nodejs, rest_api
    - Gaps exclude python and sql
    - Javascript precedes react and nodejs in the roadmap
    - React and nodejs are locked until javascript is done
    - Readiness is between 20 and 60
    """
    res = client.get("/api/state")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "success"
    assert data["profile"]["name"] == "Sample Student"
    assert data["profile"]["goal"] == "full_stack_developer"

    gap_skills = set(data["gap_skills"])
    # Gaps include javascript, react, nodejs, rest_api
    assert "javascript" in gap_skills
    assert "react" in gap_skills
    assert "nodejs" in gap_skills
    assert "rest_api" in gap_skills

    # Gaps exclude python and sql
    assert "python" not in gap_skills
    assert "sql" not in gap_skills

    # Readiness is between 20 and 60
    readiness = data["readiness"]
    assert 20 <= readiness <= 60

    # Profile Intelligence summary verification
    assert "profile_summary" in data
    summary = data["profile_summary"]
    assert len(summary["interests"]) > 0
    assert summary["selected_career"]["id"] == "full_stack_developer"
    assert len(summary["claimed_strengths"]) >= 2
    assert len(summary["main_skill_gaps"]) >= 4
    assert len(summary["observation"]) > 0

    # Roadmap sequencing and lock states
    roadmap = data["roadmap"]
    skills_in_order = [m["skill_id"] for m in roadmap]
    module_by_skill = {m["skill_id"]: m for m in roadmap}

    # Javascript precedes react and nodejs
    assert skills_in_order.index("javascript") < skills_in_order.index("react")
    assert skills_in_order.index("javascript") < skills_in_order.index("nodejs")

    # Javascript is active, react and nodejs are locked
    assert module_by_skill["javascript"]["status"] == "active"
    assert module_by_skill["react"]["status"] == "locked"
    assert module_by_skill["nodejs"]["status"] == "locked"


def test_complete_javascript_unlocks_react_and_nodejs():
    """
    Acceptance criteria:
    - Completing the javascript module unlocks react and nodejs.
    """
    # Verify initial state: react and nodejs locked
    state_before = client.get("/api/state").json()
    mod_before = {m["skill_id"]: m for m in state_before["roadmap"]}
    assert mod_before["react"]["status"] == "locked"
    assert mod_before["nodejs"]["status"] == "locked"

    # Complete javascript module
    res = client.post("/api/modules/mod-full_stack_developer-javascript/complete")
    assert res.status_code == 200
    state_after = res.json()

    mod_after = {m["skill_id"]: m for m in state_after["roadmap"]}
    assert mod_after["javascript"]["status"] == "done"
    # Unlocked to active!
    assert mod_after["react"]["status"] == "active"
    assert mod_after["nodejs"]["status"] == "active"


def test_goal_preview_writes_nothing():
    """
    Acceptance criteria:
    - POST /goal/preview to data_analyst writes nothing (assert DB row counts unchanged)
    - Returns kept/added/removed skills and readiness before/after.
    """
    counts_before = count_db_rows()

    res = client.post("/api/goal/preview", json={"goal": "data_analyst"})
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "success"
    assert set(data["kept_skills"]) == {"git", "python", "sql"}
    assert set(data["added_skills"]) == {"data_analysis", "data_visualization", "pandas"}
    assert set(data["removed_skills"]) == {"html_css", "javascript", "nodejs", "react", "rest_api"}
    assert data["readiness_before"] == 36.4
    assert data["readiness_after"] == 35.3

    # Assert DB row counts unchanged
    counts_after = count_db_rows()
    assert counts_before == counts_after


def test_goal_change_preserves_completed_modules():
    """
    Acceptance criteria:
    - POST /goal to data_analyst and back to full_stack_developer keeps completed modules for overlapping skills.
    """
    # First complete overlapping skill 'git'
    res_git = client.post("/api/modules/git/complete")
    assert res_git.status_code == 200
    state1 = res_git.json()
    mod1 = {m["skill_id"]: m for m in state1["roadmap"]}
    assert mod1["git"]["status"] == "done"

    # Switch goal to data_analyst
    res_da = client.post("/api/goal", json={"goal": "data_analyst"})
    assert res_da.status_code == 200
    state_da = res_da.json()
    assert state_da["profile"]["goal"] == "data_analyst"
    mod_da = {m["skill_id"]: m for m in state_da["roadmap"]}
    # git was completed, should still be done in data_analyst
    assert mod_da["git"]["status"] == "done"

    # Switch back to full_stack_developer
    res_fs = client.post("/api/goal", json={"goal": "full_stack_developer"})
    assert res_fs.status_code == 200
    state_fs = res_fs.json()
    assert state_fs["profile"]["goal"] == "full_stack_developer"
    mod_fs = {m["skill_id"]: m for m in state_fs["roadmap"]}
    # git completion must still be preserved!
    assert mod_fs["git"]["status"] == "done"


def test_error_response_format():
    """
    Acceptance criteria:
    - Return errors as {"status":"error","message":"..."}
    """
    # 404 error
    res_404 = client.get("/api/state/999999")
    assert res_404.status_code == 404
    data_404 = res_404.json()
    assert data_404["status"] == "error"
    assert "message" in data_404

    # 400 bad request error
    res_400 = client.post("/api/goal", json={"goal": "invalid_role_xyz"})
    assert res_400.status_code == 400
    data_400 = res_400.json()
    assert data_400["status"] == "error"
    assert "message" in data_400


def test_demo_reset_and_seed():
    """Test /demo/reset and /demo/seed endpoints."""
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["status"] == "success"

    res_seed = client.post("/api/demo/seed")
    assert res_seed.status_code == 200
    data = res_seed.json()
    assert data["status"] == "success"
    assert data["state"]["profile"]["name"] == "Sample Student"


def test_update_profile_interests_and_ratings():
    """Test updating profile interests, name, and skill ratings."""
    update_payload = {
        "name": "Jane Doe",
        "interests": "Machine learning systems, distributed computing",
        "skills": {
            "python": 4,
            "sql": 4,
            "git": 3
        }
    }
    res = client.post("/api/profile", json=update_payload)
    assert res.status_code == 200
    state = res.json()
    assert state["profile"]["name"] == "Jane Doe"
    assert state["profile"]["interests"] == "Machine learning systems, distributed computing"
    assert state["profile_summary"]["interests"] == "Machine learning systems, distributed computing"

