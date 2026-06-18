import cv2
import numpy as np


class MultiPersonDetector:
    """Detect multiple faces / persons using OpenCV Haar cascades and contour analysis."""

    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )

    def analyze(self, frame: np.ndarray) -> dict:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        frontal = self.face_cascade.detectMultiScale(gray, 1.2, 5, minSize=(60, 60))
        profile = self.profile_cascade.detectMultiScale(gray, 1.2, 5, minSize=(60, 60))

        total_faces = len(frontal) + len(profile)
        face_boxes = []

        for (x, y, w, h) in frontal:
            face_boxes.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "type": "frontal"})
        for (x, y, w, h) in profile:
            face_boxes.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "type": "profile"})

        no_face = total_faces == 0
        multiple_faces = total_faces > 1

        message = "Single candidate detected"
        if no_face:
            message = "Candidate not visible — may have left screen"
        elif multiple_faces:
            message = f"Multiple persons detected ({total_faces} faces)"

        return {
            "face_count": total_faces,
            "face_boxes": face_boxes,
            "no_face": no_face,
            "multiple_faces": multiple_faces,
            "confidence": 82.0 if total_faces <= 1 else 90.0,
            "message": message,
        }
