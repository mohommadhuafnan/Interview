import uuid
from datetime import datetime, timezone
from typing import Optional
from app.database import get_supabase
import secrets
from app.models.schemas import InterviewCreate, InterviewInviteCreate, RiskLevel

_interviews_store: dict[str, dict] = {}
_events_store: list[dict] = []


def _seed_demo_interviews():
    if _interviews_store:
        return
    from app.services.auth_service import _users_store

    candidate_id = next(
        (u["id"] for u in _users_store.values() if u["role"] == "candidate"), "demo-candidate"
    )
    interviewer_id = next(
        (u["id"] for u in _users_store.values() if u["role"] == "interviewer"), "demo-interviewer"
    )
    iid = str(uuid.uuid4())
    _interviews_store[iid] = {
        "id": iid,
        "title": "Senior Software Engineer Interview",
        "candidate_id": candidate_id,
        "interviewer_id": interviewer_id,
        "status": "scheduled",
        "questions": [
            "Explain the difference between REST and GraphQL.",
            "Describe a challenging bug you fixed recently.",
            "Implement a function to reverse a linked list.",
        ],
        "trust_score": None,
        "risk_level": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scheduled_at": datetime.now(timezone.utc).isoformat(),
    }


_seed_demo_interviews()


class InterviewService:
    @staticmethod
    async def create(data: InterviewCreate) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "title": data.title,
            "candidate_id": data.candidate_id,
            "interviewer_id": data.interviewer_id,
            "status": "scheduled",
            "questions": data.questions,
            "trust_score": None,
            "risk_level": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "scheduled_at": (data.scheduled_at or datetime.now(timezone.utc)).isoformat(),
        }
        supabase = get_supabase()
        if supabase:
            supabase.table("interviews").insert(record).execute()
        else:
            _interviews_store[record["id"]] = record
        return record

    @staticmethod
    async def create_with_invite(data: InterviewInviteCreate, created_by: Optional[str] = None) -> dict:
        token = secrets.token_urlsafe(32)
        interview_id = str(uuid.uuid4())
        record = {
            "id": interview_id,
            "title": data.title,
            "candidate_id": None,
            "interviewer_id": None,
            "status": "scheduled",
            "questions": data.questions or [
                "Tell us about yourself.",
                "Describe a technical challenge you solved.",
            ],
            "trust_score": None,
            "risk_level": None,
            "invite_token": token,
            "coding_languages": ["javascript", "python", "java", "cpp", "c", "csharp"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        }

        supabase = get_supabase()
        if not supabase:
            _interviews_store[interview_id] = record
            return {"interview": record, "invite_token": token}

        supabase.table("interviews").insert(record).execute()
        supabase.table("interview_invitations").insert(
            {
                "interview_id": interview_id,
                "invite_token": token,
                "created_by": created_by,
                "is_active": True,
            }
        ).execute()
        supabase.table("interview_sessions").insert(
            {"interview_id": interview_id, "status": "scheduled"}
        ).execute()

        return {"interview": record, "invite_token": token}

    @staticmethod
    async def list_all(role: str, user_id: str) -> list[dict]:
        supabase = get_supabase()
        if supabase:
            q = supabase.table("interviews").select("*")
            if role == "candidate":
                q = q.eq("candidate_id", user_id)
            elif role == "interviewer":
                q = q.eq("interviewer_id", user_id)
            return q.order("created_at", desc=True).execute().data or []
        interviews = list(_interviews_store.values())
        if role == "candidate":
            interviews = [i for i in interviews if i["candidate_id"] == user_id]
        elif role == "interviewer":
            interviews = [i for i in interviews if i.get("interviewer_id") == user_id]
        return sorted(interviews, key=lambda x: x["created_at"], reverse=True)

    @staticmethod
    async def get_by_id(interview_id: str) -> Optional[dict]:
        supabase = get_supabase()
        if supabase:
            result = (
                supabase.table("interviews")
                .select("*")
                .eq("id", interview_id)
                .execute()
            )
            return result.data[0] if result.data else None
        return _interviews_store.get(interview_id)

    @staticmethod
    async def update_status(interview_id: str, status: str) -> dict:
        supabase = get_supabase()
        if supabase:
            result = (
                supabase.table("interviews")
                .update({"status": status})
                .eq("id", interview_id)
                .execute()
            )
            return result.data[0]
        interview = _interviews_store.get(interview_id)
        if interview:
            interview["status"] = status
        return interview

    @staticmethod
    async def update_trust_score(
        interview_id: str, trust_score: float, risk_level: RiskLevel
    ) -> dict:
        supabase = get_supabase()
        update = {"trust_score": trust_score, "risk_level": risk_level.value}
        if supabase:
            result = (
                supabase.table("interviews")
                .update(update)
                .eq("id", interview_id)
                .execute()
            )
            return result.data[0]
        interview = _interviews_store.get(interview_id)
        if interview:
            interview.update(update)
        return interview


class EventService:
    @staticmethod
    async def create_event(event: dict) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            **event,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase = get_supabase()
        if supabase:
            supabase.table("suspicious_events").insert(record).execute()
        else:
            _events_store.append(record)
        return record

    @staticmethod
    async def list_by_interview(interview_id: str) -> list[dict]:
        supabase = get_supabase()
        if supabase:
            result = (
                supabase.table("suspicious_events")
                .select("*")
                .eq("interview_id", interview_id)
                .order("created_at", desc=True)
                .execute()
            )
            return result.data or []
        return [e for e in _events_store if e.get("interview_id") == interview_id]

    @staticmethod
    async def list_all(limit: int = 100) -> list[dict]:
        supabase = get_supabase()
        if supabase:
            result = (
                supabase.table("suspicious_events")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        return sorted(_events_store, key=lambda x: x["created_at"], reverse=True)[:limit]
