from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    InterviewCreate,
    InterviewInviteCreate,
    SuspiciousEventCreate,
    TrustScoreResponse,
    TrustScoreRequest,
    ReportRequest,
)
from app.services.interview_service import InterviewService, EventService
from app.services.trust_score_service import TrustScoreEngine
from app.services.report_service import ReportService
from app.utils.security import get_current_user, require_roles
from app.models.schemas import UserRole
from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.post("/")
async def create_interview(
    data: InterviewCreate,
    user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.HR, UserRole.INTERVIEWER)),
):
    return await InterviewService.create(data)


@router.post("/create-invite")
async def create_interview_invite(
    data: InterviewInviteCreate,
    user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.HR, UserRole.INTERVIEWER)),
):
    result = await InterviewService.create_with_invite(data, created_by=user.get("sub"))
    return {
        "interview": result["interview"],
        "invite_link": f"/join/{result['invite_token']}",
    }


@router.get("/")
async def list_interviews(user: dict = Depends(get_current_user)):
    return await InterviewService.list_all(user["role"], user["sub"])


@router.get("/{interview_id}")
async def get_interview(interview_id: str, user: dict = Depends(get_current_user)):
    interview = await InterviewService.get_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.patch("/{interview_id}/status")
async def update_status(
    interview_id: str,
    status: str,
    user: dict = Depends(get_current_user),
):
    interview = await InterviewService.update_status(interview_id, status)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.post("/events")
async def create_event(
    data: SuspiciousEventCreate,
    user: dict = Depends(get_current_user),
):
    event = await EventService.create_event(data.model_dump())
    return event


@router.get("/{interview_id}/events")
async def list_events(interview_id: str, user: dict = Depends(get_current_user)):
    return await EventService.list_by_interview(interview_id)


@router.get("/events/all")
async def list_all_events(
    user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.HR, UserRole.INTERVIEWER)),
):
    return await EventService.list_all()


@router.post("/trust-score", response_model=TrustScoreResponse)
async def calculate_trust_score(
    data: TrustScoreRequest,
    user: dict = Depends(get_current_user),
):
    result = TrustScoreEngine.calculate(data.metrics)
    await InterviewService.update_trust_score(
        data.interview_id, result["trust_score"], result["risk_level"]
    )
    return TrustScoreResponse(
        interview_id=data.interview_id,
        trust_score=result["trust_score"],
        risk_level=result["risk_level"],
        breakdown=result["breakdown"],
        recommendation=result["recommendation"],
    )


@router.post("/reports/generate")
async def generate_report(
    data: ReportRequest,
    user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.HR, UserRole.INTERVIEWER)),
):
    filepath = await ReportService.generate_pdf(data.interview_id)
    return {"report_url": f"/api/interviews/reports/download/{os.path.basename(filepath)}"}


@router.get("/reports/download/{filename}")
async def download_report(
    filename: str,
    user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.HR, UserRole.INTERVIEWER)),
):
    from app.config import get_settings

    filepath = os.path.join(get_settings().reports_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(filepath, media_type="application/pdf", filename=filename)
