from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import manager
from app.utils.security import decode_token
from app.services.trust_score_service import TrustScoreEngine
from app.services.interview_service import EventService

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    token: str = Query(default=""),
    interview_id: str = Query(default=""),
    role: str = Query(default="candidate"),
):
    if token:
        try:
            decode_token(token)
        except Exception:
            await websocket.close(code=4001)
            return

    await manager.connect(websocket, client_id, interview_id or None)

    try:
        await manager.send_personal(
            {
                "type": "connected",
                "client_id": client_id,
                "interview_id": interview_id,
                "message": "Real-time monitoring active",
            },
            websocket,
        )

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "monitoring_update":
                payload = data.get("payload", {})
                await manager.broadcast_interview(
                    interview_id,
                    {
                        "type": "monitoring_update",
                        "client_id": client_id,
                        "payload": payload,
                    },
                )

            elif msg_type == "suspicious_event":
                event = await EventService.create_event(
                    {
                        "interview_id": interview_id,
                        "event_type": data.get("event_type", "unknown"),
                        "severity": data.get("severity", "medium"),
                        "description": data.get("description", ""),
                        "confidence": data.get("confidence", 0),
                        "metadata": data.get("metadata", {}),
                    }
                )
                await manager.broadcast_interview(
                    interview_id,
                    {"type": "suspicious_event", "event": event},
                )
                if role in ("admin", "hr", "interviewer"):
                    await manager.broadcast_all_hr(
                        {"type": "alert", "event": event}
                    )

            elif msg_type == "trust_score_update":
                metrics = data.get("metrics", {})
                result = TrustScoreEngine.calculate(metrics)
                await manager.broadcast_interview(
                    interview_id,
                    {"type": "trust_score", "data": result},
                )

            elif msg_type == "ping":
                await manager.send_personal({"type": "pong"}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id, interview_id or None)
