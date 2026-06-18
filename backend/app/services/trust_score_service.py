from app.models.schemas import RiskLevel


class TrustScoreEngine:
    WEIGHTS = {
        "eye_movement": 0.20,
        "head_pose": 0.15,
        "browser_activity": 0.20,
        "answer_originality": 0.25,
        "voice_behavior": 0.10,
        "multi_person": 0.10,
    }

    @classmethod
    def calculate(cls, metrics: dict[str, float]) -> dict:
        """
        Each metric is 0-100 where 100 = fully trustworthy.
        Returns trust score, risk level, breakdown, recommendation.
        """
        breakdown = {}
        total = 0.0
        for key, weight in cls.WEIGHTS.items():
            score = metrics.get(key, 85.0)
            score = max(0.0, min(100.0, score))
            breakdown[key] = round(score, 1)
            total += score * weight

        trust_score = round(total, 1)
        risk_level = cls._risk_level(trust_score)
        recommendation = cls._recommendation(trust_score, metrics)

        return {
            "trust_score": trust_score,
            "risk_level": risk_level,
            "breakdown": breakdown,
            "recommendation": recommendation,
        }

    @staticmethod
    def _risk_level(score: float) -> RiskLevel:
        if score >= 80:
            return RiskLevel.LOW
        if score >= 60:
            return RiskLevel.MEDIUM
        if score >= 40:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL

    @staticmethod
    def _recommendation(score: float, metrics: dict) -> str:
        if score >= 85:
            return "Candidate demonstrates authentic behavior. Recommended to proceed."
        if score >= 70:
            return "Minor suspicious indicators detected. Review flagged events before final decision."
        if score >= 50:
            return "Multiple integrity concerns identified. Conduct follow-up verification interview."
        flags = []
        if metrics.get("browser_activity", 100) < 60:
            flags.append("excessive tab switching")
        if metrics.get("answer_originality", 100) < 60:
            flags.append("AI-generated answer patterns")
        if metrics.get("eye_movement", 100) < 60:
            flags.append("suspicious gaze behavior")
        if metrics.get("multi_person", 100) < 70:
            flags.append("additional persons detected")
        flag_text = ", ".join(flags) if flags else "multiple integrity violations"
        return f"High risk candidate. Detected: {flag_text}. Not recommended without thorough investigation."
