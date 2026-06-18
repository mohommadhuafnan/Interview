import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

# 3D model points for head pose estimation
MODEL_POINTS = np.array(
    [
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0),
    ],
    dtype=np.float64,
)


class HeadPoseDetector:
    """Head pose detection using MediaPipe landmarks and OpenCV solvePnP."""

    LANDMARK_IDS = [1, 152, 33, 263, 61, 291]

    def __init__(self):
        self.mp_face_mesh = None
        self.face_mesh = None
        if MEDIAPIPE_AVAILABLE:
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=False,
                min_detection_confidence=0.5,
            )

    def analyze(self, frame: np.ndarray) -> dict:
        if not MEDIAPIPE_AVAILABLE or self.face_mesh is None:
            return self._fallback(frame)

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {
                "yaw": 0, "pitch": 0, "roll": 0,
                "confidence": 0, "suspicious": True,
                "face_direction": "unknown",
            }

        landmarks = results.multi_face_landmarks[0].landmark
        image_points = np.array(
            [(landmarks[i].x * w, landmarks[i].y * h) for i in self.LANDMARK_IDS],
            dtype=np.float64,
        )

        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array(
            [[focal_length, 0, center[0]], [0, focal_length, center[1]], [0, 0, 1]],
            dtype=np.float64,
        )
        dist_coeffs = np.zeros((4, 1))

        success, rotation_vector, _ = cv2.solvePnP(
            MODEL_POINTS, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return {"yaw": 0, "pitch": 0, "roll": 0, "confidence": 50, "suspicious": False}

        rotation_mat, _ = cv2.Rodrigues(rotation_vector)
        pose_mat = cv2.hconcat((rotation_mat, np.zeros((3, 1))))
        _, _, _, _, _, euler = cv2.decomposeProjectionMatrix(
            cv2.vconcat((pose_mat, np.array([[0, 0, 0, 1]])))
        )

        pitch = euler[0][0]
        yaw = euler[1][0]
        roll = euler[2][0]

        suspicious = abs(yaw) > 25 or abs(pitch) > 20
        direction = "center"
        if yaw > 20:
            direction = "right"
        elif yaw < -20:
            direction = "left"
        elif pitch > 15:
            direction = "down"
        elif pitch < -15:
            direction = "up"

        return {
            "yaw": round(float(yaw), 2),
            "pitch": round(float(pitch), 2),
            "roll": round(float(roll), 2),
            "confidence": 88.0,
            "suspicious": suspicious,
            "face_direction": direction,
        }

    def _fallback(self, frame: np.ndarray) -> dict:
        return {
            "yaw": 0.0,
            "pitch": 0.0,
            "roll": 0.0,
            "confidence": 60.0,
            "suspicious": False,
            "face_direction": "center",
            "message": "MediaPipe unavailable, head pose estimation limited",
        }
