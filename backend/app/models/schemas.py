from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    HR = "hr"
    INTERVIEWER = "interviewer"
    CANDIDATE = "candidate"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: UserRole = UserRole.CANDIDATE


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class InterviewCreate(BaseModel):
    title: str
    candidate_id: str
    interviewer_id: Optional[str] = None
    questions: list[str] = []
    scheduled_at: Optional[datetime] = None


class InterviewResponse(BaseModel):
    id: str
    title: str
    candidate_id: str
    interviewer_id: Optional[str]
    status: str
    trust_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    created_at: datetime


class SuspiciousEventCreate(BaseModel):
    interview_id: str
    event_type: str
    severity: str
    description: str
    metadata: dict[str, Any] = {}
    confidence: float = 0.0


class SuspiciousEventResponse(BaseModel):
    id: str
    interview_id: str
    event_type: str
    severity: str
    description: str
    confidence: float
    created_at: datetime
    metadata: dict[str, Any] = {}


class TrustScoreResponse(BaseModel):
    interview_id: str
    trust_score: float
    risk_level: RiskLevel
    breakdown: dict[str, float]
    recommendation: str


class AnalysisRequest(BaseModel):
    interview_id: str
    analysis_type: str
    data: dict[str, Any] = {}


class AnswerAnalysisRequest(BaseModel):
    interview_id: str
    question: str
    answer: str


class AnswerAnalysisResponse(BaseModel):
    originality_score: float
    ai_probability: float
    flags: list[str]
    analysis_summary: str


class BrowserEventCreate(BaseModel):
    interview_id: str
    event_type: str
    details: dict[str, Any] = {}


class ReportRequest(BaseModel):
    interview_id: str


class TrustScoreRequest(BaseModel):
    interview_id: str
    metrics: dict[str, float]
