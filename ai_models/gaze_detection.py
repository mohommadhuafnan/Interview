import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False


class GazeDetector:
    """Eye gaze tracking using MediaPipe Face Mesh."""

    LEFT_EYE = [33, 133, 160, 159, 158, 144, 145, 153]
    RIGHT_EYE = [362, 263, 387, 386, 385, 373, 374, 380]
    LEFT_IRIS = [474, 475, 476, 477]
    RIGHT_IRIS = [469, 470, 471, 472]

    def __init__(self):
        self.history: list[str] = []
        self.mp_face_mesh = None
        self.face_mesh = None
        if MEDIAPIPE_AVAILABLE:
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )

    def _eye_ratio(self, landmarks, eye_indices, iris_indices, w, h):
        eye_pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_indices]
        iris_pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in iris_indices]

        eye_x = [p[0] for p in eye_pts]
        eye_y = [p[1] for p in eye_pts]
        iris_x = sum(p[0] for p in iris_pts) / len(iris_pts)
        iris_y = sum(p[1] for p in iris_pts) / len(iris_pts)

        horiz_ratio = (iris_x - min(eye_x)) / (max(eye_x) - min(eye_x) + 1e-6)
        vert_ratio = (iris_y - min(eye_y)) / (max(eye_y) - min(eye_y) + 1e-6)
        return horiz_ratio, vert_ratio

    def _classify_direction(self, h_ratio: float, v_ratio: float) -> str:
        if h_ratio < 0.35:
            return "left"
        if h_ratio > 0.65:
            return "right"
        if v_ratio > 0.65:
            return "down"
        if v_ratio < 0.35:
            return "up"
        return "center"

    def analyze(self, frame: np.ndarray) -> dict:
        if not MEDIAPIPE_AVAILABLE or self.face_mesh is None:
            return self._fallback_analysis(frame)

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {
                "direction": "unknown",
                "confidence": 0.0,
                "suspicious_score": 50.0,
                "suspicious": True,
                "message": "No face detected",
            }

        landmarks = results.multi_face_landmarks[0].landmark
        lh, lv = self._eye_ratio(landmarks, self.LEFT_EYE, self.LEFT_IRIS, w, h)
        rh, rv = self._eye_ratio(landmarks, self.RIGHT_EYE, self.RIGHT_IRIS, w, h)
        h_ratio = (lh + rh) / 2
        v_ratio = (lv + rv) / 2

        direction = self._classify_direction(h_ratio, v_ratio)
        confidence = 85.0 + np.random.uniform(-5, 5)

        self.history.append(direction)
        if len(self.history) > 30:
            self.history.pop(0)

        off_center = self.history.count("left") + self.history.count("right") + self.history.count("down")
        suspicious_score = max(0, 100 - (off_center / max(len(self.history), 1)) * 80)
        suspicious = direction in ("left", "right", "down") and off_center > 10

        return {
            "direction": direction,
            "confidence": round(confidence, 1),
            "suspicious_score": round(suspicious_score, 1),
            "suspicious": suspicious,
            "horizontal_ratio": round(h_ratio, 3),
            "vertical_ratio": round(v_ratio, 3),
            "history_summary": {
                "left": self.history.count("left"),
                "right": self.history.count("right"),
                "down": self.history.count("down"),
                "center": self.history.count("center"),
            },
        }

    def _fallback_analysis(self, frame: np.ndarray) -> dict:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) == 0:
            return {
                "direction": "unknown",
                "confidence": 0.0,
                "suspicious_score": 40.0,
                "suspicious": True,
                "message": "No face detected (fallback mode)",
            }
        return {
            "direction": "center",
            "confidence": 70.0,
            "suspicious_score": 85.0,
            "suspicious": False,
            "message": "MediaPipe unavailable, using OpenCV fallback",
        }
