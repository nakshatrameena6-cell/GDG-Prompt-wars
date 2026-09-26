import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from backend.main import app
from backend.schemas import GeminiAnalysisResult
from backend.gemini_service import (
    GeminiConfigError,
    GeminiAPIError,
    GeminiParsingError,
)

client = TestClient(app)


def test_health_check():
    """Test health endpoint returns 200 OK and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["phase"] == 1


def test_analyze_empty_string():
    """Test empty input message is rejected with 400 Bad Request."""
    response = client.post("/api/analyze", json={"message": ""})
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert "Input message cannot be empty" in data["message"]


def test_analyze_whitespace_only():
    """Test whitespace-only input message is rejected with 400 Bad Request."""
    response = client.post("/api/analyze", json={"message": "    \t\n   "})
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert "Input message cannot be empty" in data["message"]


def test_analyze_missing_field():
    """Test malformed request payload with missing 'message' field is rejected with 400."""
    response = client.post("/api/analyze", json={})
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"


def test_analyze_missing_api_key():
    """Test that missing GEMINI_API_KEY returns a clean 500 error response without crashing."""
    with patch("backend.main.analyze_placement_query") as mock_analyze:
        mock_analyze.side_effect = GeminiConfigError("GEMINI_API_KEY is not configured in the server environment.")
        response = client.post("/api/analyze", json={"message": "I need help with placement prep."})
        assert response.status_code == 500
        data = response.json()
        assert data["status"] == "error"
        assert "GEMINI_API_KEY" in data["message"]


def test_analyze_gemini_api_failure():
    """Test that upstream Gemini API failures return a controlled 503 error."""
    with patch("backend.main.analyze_placement_query") as mock_analyze:
        mock_analyze.side_effect = GeminiAPIError("Failed to communicate with Gemini API: Quota exceeded")
        response = client.post("/api/analyze", json={"message": "I need help with placement prep."})
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "error"
        assert "unavailable" in data["message"] or "failed" in data["message"]


def test_analyze_gemini_parsing_failure():
    """Test that invalid structured response from Gemini returns a controlled 502 error."""
    with patch("backend.main.analyze_placement_query") as mock_analyze:
        mock_analyze.side_effect = GeminiParsingError("Gemini did not return valid JSON")
        response = client.post("/api/analyze", json={"message": "I need help with placement prep."})
        assert response.status_code == 502
        data = response.json()
        assert data["status"] == "error"
        assert "invalid" in data["message"].lower() or "unparseable" in data["message"].lower()


def test_analyze_success():
    """Test successful Gemini request and structured response pipeline."""
    expected_advice = (
        "Focus on fundamental topics first: Number Systems, Percentages, Profit & Loss, "
        "and Time & Work. Practice 20 questions daily from standard placement prep materials."
    )
    mock_result = GeminiAnalysisResult(status="success", message=expected_advice)
    
    with patch("backend.main.analyze_placement_query", return_value=mock_result):
        response = client.post(
            "/api/analyze",
            json={"message": "I am weak in quantitative aptitude."}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["message"] == expected_advice
