import asyncio
import json
import base64
from io import BytesIO
from PIL import Image
import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging

from .detect_qr import detect_qr_code
from service.ar_model.repository.ar_object_repo import ArObjectRepository   

logger = logging.getLogger(__name__)

class QRWebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.ar_repo = ArObjectRepository()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def process_frame(self, websocket: WebSocket, frame_data: dict):
        """
        Process incoming frame data and detect QR codes
        Expected frame_data format: {"imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."}
        """
        try:
            # Extract base64 image data
            image_base64 = frame_data.get("imageBase64", "")
            if not image_base64:
                await self.send_error(websocket, "No image data provided")
                return

            # Remove data URL prefix if present
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]

            # Decode base64 to image
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))
            
            # Convert PIL image to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

            # Detect QR code
            qr_result = detect_qr_code(opencv_image)
            
            if qr_result and qr_result.get("qr_id"):
                # Get AR object data from database
                ar_object = await self.ar_repo.get_by_qr_id(qr_result["qr_id"])
                
                if ar_object:
                    # Prepare MindAR response format
                    response = {
                        "success": True,
                        "qr_id": qr_result["qr_id"],
                        "mind_file_url": ar_object.get("mind_file_url", ""),
                        "targets": [
                            {
                                "targetId": ar_object.get("target_id", 0),
                                "model_url": ar_object.get("model_url", ""),
                                "scale": ar_object.get("scale", "1 1 1"),
                                "position": ar_object.get("position", "0 0 0"),
                                "rotation": ar_object.get("rotation", "0 0 0"),
                                "tag": ar_object.get("ar_tag", ""),
                                "description": ar_object.get("description", "")
                            }
                        ]
                    }
                    await self.send_message(websocket, response)
                else:
                    await self.send_error(websocket, f"No AR object found for QR ID: {qr_result['qr_id']}")
            else:
                # No QR code detected - send empty response
                await self.send_message(websocket, {
                    "success": False,
                    "message": "No QR code detected in frame"
                })

        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
            await self.send_error(websocket, f"Frame processing error: {str(e)}")

    async def send_message(self, websocket: WebSocket, message: dict):
        """Send JSON message to WebSocket client"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")

    async def send_error(self, websocket: WebSocket, error_message: str):
        """Send error message to WebSocket client"""
        error_response = {
            "success": False,
            "error": error_message
        }
        await self.send_message(websocket, error_response)

# Global WebSocket manager instance
ws_manager = QRWebSocketManager()
