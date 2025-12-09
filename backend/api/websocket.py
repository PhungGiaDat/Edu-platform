"""
WebSocket API Router - Handles real-time frame verification and QR detection

NOTE: This module requires OpenCV (cv2) for frame processing.
QR detection is now handled on frontend, so this module is DISABLED.
To enable, install: pip install opencv-python-headless
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import logging
import json

# NOTE: VerificationService requires OpenCV which is not installed
# QR detection is handled on frontend
# from services.verification_service import VerificationService, get_verification_service
from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from repositories.ar_object_repository import ARObjectRepository, get_ar_object_repository


logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


class WebSocketConnectionManager:
    """Manages active WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_json(self, websocket: WebSocket, data: Dict):
        """Send JSON data to a specific WebSocket"""
        await websocket.send_text(json.dumps(data))
    
    async def send_error(self, websocket: WebSocket, error_msg: str):
        """Send error message to WebSocket"""
        await self.send_json(websocket, {"error": error_msg})


# Global connection manager instance
ws_manager = WebSocketConnectionManager()


# ============================================================
# NOTE: The following endpoints are DISABLED because they require
# OpenCV (cv2) which is not installed.
# QR detection is now handled on frontend via JS libraries.
# To enable these endpoints, install: pip install opencv-python-headless
# and uncomment the verification_service import above.
# ============================================================

# @router.websocket("/ws/qr/verify")
# async def websocket_verify_endpoint(...):
#     """DISABLED - QR verification moved to frontend"""
#     pass

# @router.websocket("/wss/detect_qr")  
# async def websocket_detect_qr_endpoint(...):
#     """DISABLED - QR detection moved to frontend"""
#     pass


@router.websocket("/ws/ping")
async def websocket_ping_endpoint(websocket: WebSocket):
    """
    Simple WebSocket ping endpoint for connection testing.
    Responds with 'pong' to any message.
    """
    await ws_manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.send_json(websocket, {"type": "pong", "received": data})
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("Client disconnected from /ws/ping")
