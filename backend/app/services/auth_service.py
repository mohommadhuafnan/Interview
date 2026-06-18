import uuid
from datetime import datetime, timezone
from typing import Optional
from app.database import get_supabase
from app.utils.security import hash_password, verify_password, create_access_token
from app.models.schemas import UserCreate, UserLogin, UserRole

# In-memory fallback when Supabase is not configured
_users_store: dict[str, dict] = {}


def _seed_demo_users():
    if _users_store:
        return
    demo = [
        ("admin@interviewguard.com", "Admin User", UserRole.ADMIN, "admin123"),
        ("hr@interviewguard.com", "HR Manager", UserRole.HR, "hr123456"),
        ("interviewer@interviewguard.com", "John Interviewer", UserRole.INTERVIEWER, "interview123"),
        ("candidate@interviewguard.com", "Jane Candidate", UserRole.CANDIDATE, "candidate123"),
    ]
    for email, name, role, pwd in demo:
        uid = str(uuid.uuid4())
        _users_store[email] = {
            "id": uid,
            "email": email,
            "full_name": name,
            "role": role.value,
            "password_hash": hash_password(pwd),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }


_seed_demo_users()


class AuthService:
    @staticmethod
    async def register(data: UserCreate) -> dict:
        supabase = get_supabase()
        user_record = {
            "id": str(uuid.uuid4()),
            "email": data.email,
            "full_name": data.full_name,
            "role": data.role.value,
            "password_hash": hash_password(data.password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if supabase:
            existing = (
                supabase.table("users")
                .select("id")
                .eq("email", data.email)
                .execute()
            )
            if existing.data:
                raise ValueError("Email already registered")
            supabase.table("users").insert(
                {k: v for k, v in user_record.items() if k != "password_hash"}
                | {"password_hash": user_record["password_hash"]}
            ).execute()
        else:
            if data.email in _users_store:
                raise ValueError("Email already registered")
            _users_store[data.email] = user_record

        token = create_access_token(
            {"sub": user_record["id"], "email": data.email, "role": data.role.value}
        )
        return {
            "access_token": token,
            "user": {
                "id": user_record["id"],
                "email": data.email,
                "full_name": data.full_name,
                "role": data.role.value,
            },
        }

    @staticmethod
    async def login(data: UserLogin) -> dict:
        supabase = get_supabase()
        user = None

        if supabase:
            result = (
                supabase.table("users")
                .select("*")
                .eq("email", data.email)
                .execute()
            )
            if result.data:
                user = result.data[0]
        else:
            user = _users_store.get(data.email)

        if not user or not verify_password(data.password, user["password_hash"]):
            raise ValueError("Invalid email or password")

        token = create_access_token(
            {"sub": user["id"], "email": user["email"], "role": user["role"]}
        )
        return {
            "access_token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
            },
        }

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[dict]:
        supabase = get_supabase()
        if supabase:
            result = supabase.table("users").select("*").eq("id", user_id).execute()
            return result.data[0] if result.data else None
        for u in _users_store.values():
            if u["id"] == user_id:
                return u
        return None
