import json
import logging
import re
from typing import Optional
from backend.config import settings
from backend.schemas import GeminiAnalysisResult

logger = logging.getLogger(__name__)


class GeminiConfigError(Exception):
    """Raised when GEMINI_API_KEY is missing or invalid in configuration."""
    pass


class GeminiAPIError(Exception):
    """Raised when the upstream Gemini API call fails."""
    pass


class GeminiParsingError(Exception):
    """Raised when Gemini response cannot be parsed or does not conform to expected schema."""
    pass


SYSTEM_INSTRUCTION = (
    "You are an expert AI assistant dedicated to student placement preparation. "
    "Your role is to assess student queries, concerns, or self-reported weaknesses regarding "
    "their campus placement readiness (e.g. quantitative aptitude, coding, technical domains, HR interviews, resume building) "
    "and provide constructive, actionable, and structured guidance.\n\n"
    "CRITICAL REQUIREMENT: You MUST respond in valid JSON format matching this exact schema:\n"
    "{\n"
    '  "status": "success",\n'
    '  "message": "Your actionable placement preparation guidance here."\n'
    "}\n"
    "Do NOT include any text outside the JSON object."
)


def _clean_json_text(raw_text: str) -> str:
    """Strips markdown code fences and extraneous text if present."""
    text = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()
    return text


def analyze_placement_query(student_input: str) -> GeminiAnalysisResult:
    """
    Calls the Gemini API to analyze the student's placement preparation query.
    Validates configuration, securely calls Gemini, parses and validates the structured JSON response.
    Never logs or exposes the API key.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise GeminiConfigError("GEMINI_API_KEY is not configured in the server environment.")

    # Call Gemini model
    model_name = settings.GEMINI_MODEL
    raw_response_text: Optional[str] = None

    # First attempt using google-genai if available, else google-generativeai
    try:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            prompt = f"Student placement input: {student_input}"
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                ),
            )
            raw_response_text = response.text
        except ImportError:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=SYSTEM_INSTRUCTION,
                generation_config={"response_mime_type": "application/json"},
            )
            response = model.generate_content(f"Student placement input: {student_input}")
            raw_response_text = response.text
    except GeminiConfigError:
        raise
    except Exception as e:
        logger.error(f"Gemini API request failed: {type(e).__name__}")
        raise GeminiAPIError(f"Failed to communicate with Gemini API: {str(e)}")

    if not raw_response_text:
        raise GeminiParsingError("Gemini returned an empty response.")

    # Parse and validate JSON structure
    cleaned = _clean_json_text(raw_response_text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as jde:
        logger.error("Failed to decode JSON from Gemini response")
        raise GeminiParsingError(f"Gemini did not return valid JSON: {str(jde)}")

    try:
        result = GeminiAnalysisResult.model_validate(data)
    except Exception as ve:
        logger.error("Gemini JSON does not conform to GeminiAnalysisResult schema")
        raise GeminiParsingError(f"Gemini response structure mismatch: {str(ve)}")

    return result
