from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import AuthService
from app.utils.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    try:
        result = await AuthService.register(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    try:
        result = await AuthService.login(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    db_user = await AuthService.get_user_by_id(user["sub"])
    if not db_user:
        return UserResponse(
            id=user["sub"],
            email=user["email"],
            full_name=user.get("email", "").split("@")[0],
            role=user["role"],
        )
    return UserResponse(
        id=db_user["id"],
        email=db_user["email"],
        full_name=db_user["full_name"],
        role=db_user["role"],
    )
