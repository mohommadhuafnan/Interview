from supabase import create_client, Client
from app.config import get_settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        settings = get_settings()
        if settings.supabase_url and settings.supabase_key:
            _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def get_service_supabase() -> Client | None:
    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_key:
        return create_client(settings.supabase_url, settings.supabase_service_key)
    return get_supabase()
