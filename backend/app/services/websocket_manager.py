import json
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}
        self.interview_subscribers: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, interview_id: str | None = None):
        await websocket.accept()
        if client_id not in self.active:
            self.active[client_id] = set()
        self.active[client_id].add(websocket)

        if interview_id:
            if interview_id not in self.interview_subscribers:
                self.interview_subscribers[interview_id] = set()
            self.interview_subscribers[interview_id].add(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str, interview_id: str | None = None):
        if client_id in self.active:
            self.active[client_id].discard(websocket)
            if not self.active[client_id]:
                del self.active[client_id]
        if interview_id and interview_id in self.interview_subscribers:
            self.interview_subscribers[interview_id].discard(websocket)

    async def send_personal(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_interview(self, interview_id: str, message: dict):
        if interview_id in self.interview_subscribers:
            dead = []
            for ws in self.interview_subscribers[interview_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.interview_subscribers[interview_id].discard(ws)

    async def broadcast_all_hr(self, message: dict):
        for connections in self.active.values():
            for ws in connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()
