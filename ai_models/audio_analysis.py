import tempfile
import os
import struct
import math


class AudioAnalyzer:
    """Audio analysis for external voices, silence, and suspicious patterns."""

    def __init__(self):
        self._whisper_model = None

    def _load_whisper(self):
        if self._whisper_model is None:
            try:
                import whisper
                self._whisper_model = whisper.load_model("tiny")
            except Exception:
                self._whisper_model = False
        return self._whisper_model if self._whisper_model is not False else None

    def analyze_bytes(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict:
        ext = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            return self._analyze_file(temp_path)
        finally:
            os.unlink(temp_path)

    def _analyze_file(self, filepath: str) -> dict:
        whisper = self._load_whisper()
        transcript = ""
        suspicious = False
        flags = []

        if whisper:
            try:
                result = whisper.transcribe(filepath, fp16=False)
                transcript = result.get("text", "").strip()
            except Exception:
                transcript = ""

        silence_ratio = self._estimate_silence(filepath)
        if silence_ratio > 0.6:
            flags.append("extended_silence")
            suspicious = True

        if transcript:
            external_indicators = ["hello", "tell them", "say that", "the answer is", "look at"]
            for indicator in external_indicators:
                if indicator in transcript.lower():
                    flags.append(f"external_voice_hint:{indicator}")
                    suspicious = True

        return {
            "transcript": transcript,
            "silence_ratio": round(silence_ratio, 2),
            "suspicious": suspicious,
            "confidence": 75.0 if suspicious else 90.0,
            "flags": flags,
            "message": "External voice or extended silence detected" if suspicious else "Normal audio patterns",
        }

    def _estimate_silence(self, filepath: str) -> float:
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            if len(data) < 100:
                return 0.5
            samples = []
            for i in range(44, min(len(data), 10000), 2):
                if i + 1 < len(data):
                    val = struct.unpack("<h", data[i : i + 2])[0]
                    samples.append(abs(val))
            if not samples:
                return 0.3
            threshold = max(samples) * 0.05
            silent = sum(1 for s in samples if s < threshold)
            return silent / len(samples)
        except Exception:
            return 0.2
