import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.gemini_service import (
    GeminiAPIError,
    GeminiConfigError,
    GeminiParsingError,
    analyze_placement_query,
)
from backend.schemas import AnalyzeRequest, AnalyzeResponse, ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("placementpilot")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PlacementPilot API - Phase 1 Foundation",
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for request validation errors (e.g. empty or missing fields)."""
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Invalid request data"
    # Clean up error message prefix if pydantic includes "Value error, "
    if "Value error, " in first_error:
        first_error = first_error.replace("Value error, ", "")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            status="error",
            message=first_error,
            detail=str(errors),
        ).model_dump(),
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "phase": 1,
    }


@app.post(
    "/api/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error or empty input"},
        500: {"model": ErrorResponse, "description": "Configuration error (e.g. missing API key)"},
        502: {"model": ErrorResponse, "description": "AI response structure mismatch"},
        503: {"model": ErrorResponse, "description": "Gemini API communication failure"},
    },
)
async def analyze_endpoint(payload: AnalyzeRequest):
    """
    Analyzes student placement preparation query via Gemini API.
    Validates input, requests structured JSON from Gemini, validates output, and returns response.
    """
    try:
        result = analyze_placement_query(payload.message)
        return AnalyzeResponse(
            status=result.status,
            message=result.message,
        )
    except GeminiConfigError as ce:
        logger.error("Configuration error encountered during /api/analyze")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                status="error",
                message="Gemini API is not configured on the server. Please check GEMINI_API_KEY.",
                detail=str(ce),
            ).model_dump(),
        )
    except GeminiParsingError as pe:
        logger.error(f"Structured output error: {pe}")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorResponse(
                status="error",
                message="AI service returned an invalid or unparseable response structure.",
                detail=str(pe),
            ).model_dump(),
        )
    except GeminiAPIError as ae:
        logger.error(f"Gemini API failure: {ae}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorResponse(
                status="error",
                message="Gemini API service is currently unavailable or failed to process the request.",
                detail=str(ae),
            ).model_dump(),
        )
    except Exception as e:
        logger.exception(f"Unexpected server error: {type(e).__name__}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                status="error",
                message="An unexpected server error occurred while processing the request.",
            ).model_dump(),
        )
