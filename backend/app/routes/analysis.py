from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.models.schemas import (
    AnalysisRequest,
    AnswerAnalysisRequest,
    AnswerAnalysisResponse,
    BrowserEventCreate,
)
from app.services.interview_service import EventService
from app.utils.security import get_current_user
import base64
import io
import numpy as np
from PIL import Image

router = APIRouter(prefix="/analysis", tags=["AI Analysis"])


def _decode_frame(image_b64: str) -> np.ndarray:
    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]
    img_bytes = base64.b64decode(image_b64)
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(image)[:, :, ::-1]


@router.post("/gaze")
async def analyze_gaze(
    data: AnalysisRequest,
    user: dict = Depends(get_current_user),
):
    from ai_models.gaze_detection import GazeDetector

    detector = GazeDetector()
    image_b64 = data.data.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Image data required")

    frame = _decode_frame(image_b64)
    result = detector.analyze(frame)
    if result.get("suspicious"):
        await EventService.create_event(
            {
                "interview_id": data.interview_id,
                "event_type": "gaze_anomaly",
                "severity": "medium" if result["suspicious_score"] < 70 else "high",
                "description": f"Suspicious gaze: {result['direction']} (score: {result['suspicious_score']})",
                "confidence": result["confidence"],
                "metadata": result,
            }
        )
    return result


@router.post("/head-pose")
async def analyze_head_pose(
    data: AnalysisRequest,
    user: dict = Depends(get_current_user),
):
    from ai_models.head_pose import HeadPoseDetector

    detector = HeadPoseDetector()
    image_b64 = data.data.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Image data required")

    frame = _decode_frame(image_b64)
    result = detector.analyze(frame)
    if result.get("suspicious"):
        await EventService.create_event(
            {
                "interview_id": data.interview_id,
                "event_type": "head_pose_anomaly",
                "severity": "medium",
                "description": f"Abnormal head pose detected: yaw={result['yaw']:.1f}, pitch={result['pitch']:.1f}",
                "confidence": result["confidence"],
                "metadata": result,
            }
        )
    return result


@router.post("/multi-person")
async def analyze_multi_person(
    data: AnalysisRequest,
    user: dict = Depends(get_current_user),
):
    from ai_models.multi_person import MultiPersonDetector

    detector = MultiPersonDetector()
    image_b64 = data.data.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Image data required")

    frame = _decode_frame(image_b64)
    result = detector.analyze(frame)
    if result.get("multiple_faces") or result.get("no_face"):
        await EventService.create_event(
            {
                "interview_id": data.interview_id,
                "event_type": "multi_person",
                "severity": "high",
                "description": result.get("message", "Multiple persons or no candidate detected"),
                "confidence": result["confidence"],
                "metadata": result,
            }
        )
    return result


@router.post("/answer", response_model=AnswerAnalysisResponse)
async def analyze_answer(
    data: AnswerAnalysisRequest,
    user: dict = Depends(get_current_user),
):
    from ai_models.nlp_analysis import NLPAnalyzer

    analyzer = NLPAnalyzer()
    result = analyzer.analyze(data.answer, data.question)

    if result["ai_probability"] > 0.6:
        await EventService.create_event(
            {
                "interview_id": data.interview_id,
                "event_type": "ai_generated_answer",
                "severity": "high" if result["ai_probability"] > 0.8 else "medium",
                "description": f"Potential AI-generated response detected (AI prob: {result['ai_probability']:.0%})",
                "confidence": result["ai_probability"] * 100,
                "metadata": result,
            }
        )
    return AnswerAnalysisResponse(**result)


@router.post("/browser-event")
async def log_browser_event(
    data: BrowserEventCreate,
    user: dict = Depends(get_current_user),
):
    severity_map = {
        "tab_switch": "high",
        "copy": "medium",
        "paste": "medium",
        "visibility_hidden": "high",
        "fullscreen_exit": "high",
        "blur": "medium",
    }
    severity = severity_map.get(data.event_type, "low")
    event = await EventService.create_event(
        {
            "interview_id": data.interview_id,
            "event_type": data.event_type,
            "severity": severity,
            "description": f"Browser event: {data.event_type}",
            "confidence": 95.0,
            "metadata": data.details,
        }
    )
    return event


@router.post("/audio")
async def analyze_audio(
    interview_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    from ai_models.audio_analysis import AudioAnalyzer

    content = await file.read()
    analyzer = AudioAnalyzer()
    result = analyzer.analyze_bytes(content, file.filename or "audio.webm")

    if result.get("suspicious"):
        await EventService.create_event(
            {
                "interview_id": interview_id,
                "event_type": "audio_anomaly",
                "severity": "medium",
                "description": result.get("message", "Suspicious audio pattern detected"),
                "confidence": result.get("confidence", 70),
                "metadata": result,
            }
        )
    return result
