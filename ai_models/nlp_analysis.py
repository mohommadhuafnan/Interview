import re
import tempfile
import os

AI_PATTERNS = [
    r"\bas an ai\b",
    r"\bi'd be happy to\b",
    r"\blet me break (this|it) down\b",
    r"\bin conclusion\b",
    r"\bto summarize\b",
    r"\bfurthermore\b",
    r"\badditionally\b",
    r"\bit's worth noting\b",
    r"\bcomprehensive\b",
    r"\brobust solution\b",
    r"\bleverage\b",
    r"\butilize\b",
    r"\bparadigm\b",
    r"\bseamlessly\b",
    r"\bdelve into\b",
    r"\bin today's (world|landscape)\b",
]

CHATGPT_PHRASES = [
    "certainly!",
    "great question",
    "that's a great question",
    "here's a breakdown",
    "here are the key points",
    "in my experience",
    "it's important to note",
    "on the other hand",
    "with that said",
]


class NLPAnalyzer:
    """NLP-based answer authenticity analysis using pattern detection and heuristics."""

    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._load_model()

    def _load_model(self):
        try:
            from transformers import pipeline
            self._classifier = pipeline(
                "text-classification",
                model="Hello-SimpleAI/chatgpt-detector-roberta",
                top_k=None,
                device=-1,
            )
        except Exception:
            self._classifier = None

    def analyze(self, answer: str, question: str = "") -> dict:
        flags = []
        ai_score = 0.0

        answer_lower = answer.lower().strip()
        word_count = len(answer.split())

        if word_count < 5:
            return {
                "originality_score": 50.0,
                "ai_probability": 0.3,
                "flags": ["answer_too_short"],
                "analysis_summary": "Answer is too short for meaningful analysis.",
            }

        for pattern in AI_PATTERNS:
            if re.search(pattern, answer_lower):
                flags.append(f"ai_pattern:{pattern}")
                ai_score += 0.08

        for phrase in CHATGPT_PHRASES:
            if phrase in answer_lower:
                flags.append(f"chatgpt_phrase:{phrase}")
                ai_score += 0.1

        if self._classifier:
            try:
                result = self._classifier(answer[:512])
                if isinstance(result, list) and result:
                    for item in result[0] if isinstance(result[0], list) else result:
                        label = item.get("label", "").lower()
                        score = item.get("score", 0)
                        if "chatgpt" in label or "ai" in label or label == "label_1":
                            ai_score = max(ai_score, score)
            except Exception:
                pass

        sentence_lengths = [len(s.split()) for s in re.split(r"[.!?]+", answer) if s.strip()]
        if sentence_lengths:
            avg_len = sum(sentence_lengths) / len(sentence_lengths)
            if avg_len > 25:
                flags.append("uniform_long_sentences")
                ai_score += 0.05

        if re.search(r"^\d+\.\s", answer, re.MULTILINE):
            flags.append("numbered_list_format")
            ai_score += 0.05

        ai_probability = min(1.0, ai_score)
        originality_score = round((1 - ai_probability) * 100, 1)

        if ai_probability > 0.7:
            summary = "High probability of AI-generated content detected."
        elif ai_probability > 0.4:
            summary = "Moderate AI writing patterns detected. Manual review recommended."
        else:
            summary = "Answer appears authentic with natural language patterns."

        return {
            "originality_score": originality_score,
            "ai_probability": round(ai_probability, 3),
            "flags": flags,
            "analysis_summary": summary,
        }
