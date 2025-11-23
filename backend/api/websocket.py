"""
WebSocket API Router - Handles real-time frame verification and QR detection
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import logging
import json

from services.verification_service import VerificationService, get_verification_service
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


@router.websocket("/ws/qr/verify")
async def websocket_verify_endpoint(
    websocket: WebSocket,
    flashcard_repo: FlashcardRepository = Depends(get_flashcard_repository),
    verification_service: VerificationService = Depends(
        lambda: get_verification_service(
            flashcard_repo=get_flashcard_repository(),
            ar_object_repo=get_ar_object_repository()
        )
    )
):
    """
    WebSocket endpoint for real-time frame verification against flashcard images.
    
    Expected message format:
    {
        "qr_id": "flashcard_id",
        "frame": "base64_encoded_image"
    }
    
    Response format:
    {
        "status": "success" | "fail",
        "confidence": float,
        "verification_count": int,
        "message": str
    }
    """
    await ws_manager.connect(websocket)
    
    # Verification state
    verification_count = 0
    max_verifications = 100
    tolerance = 0.8  # 80% confidence threshold for successful verification
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            qr_id = message.get("qr_id")
            frame_b64 = message.get("frame")
            
            if not qr_id or not frame_b64:
                await ws_manager.send_error(websocket, "Missing qr_id or frame data")
                continue
            
            # Increment verification attempt counter
            verification_count += 1
            
            # Check if max attempts reached
            if verification_count > max_verifications:
                await ws_manager.send_json(websocket, {
                    "status": "fail",
                    "confidence": 0.0,
                    "verification_count": verification_count,
                    "message": f"Max verification attempts ({max_verifications}) reached"
                })
                break
            
            # Fetch flashcard from database
            flashcard = await flashcard_repo.get_by_qr_id(qr_id)
            if not flashcard:
                await ws_manager.send_json(websocket, {
                    "status": "fail",
                    "confidence": 0.0,
                    "verification_count": verification_count,
                    "message": f"Flashcard with QR ID '{qr_id}' not found"
                })
                continue
            
            card_ref_path = flashcard.get("questionImagePath")
            if not card_ref_path:
                await ws_manager.send_json(websocket, {
                    "status": "fail",
                    "confidence": 0.0,
                    "verification_count": verification_count,
                    "message": "Flashcard has no reference image path"
                })
                continue
            
            try:
                # Decode base64 frame to BGR image
                frame_bgr = verification_service.decode_base64_to_bgr(frame_b64)
                
                # Verify frame against reference image
                is_valid, confidence = await verification_service.verify_frame(
                    frame_bgr, 
                    card_ref_path
                )
                
                # Send verification result
                if is_valid and confidence >= tolerance:
                    await ws_manager.send_json(websocket, {
                        "status": "success",
                        "confidence": confidence,
                        "verification_count": verification_count,
                        "message": "Verification successful"
                    })
                else:
                    await ws_manager.send_json(websocket, {
                        "status": "fail",
                        "confidence": confidence,
                        "verification_count": verification_count,
                        "message": f"Verification failed (confidence: {confidence:.2%})"
                    })
            
            except Exception as e:
                logger.error(f"Error during frame verification: {str(e)}")
                await ws_manager.send_json(websocket, {
                    "status": "error",
                    "confidence": 0.0,
                    "verification_count": verification_count,
                    "message": f"Processing error: {str(e)}"
                })
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("Client disconnected from /ws/qr/verify")
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        ws_manager.disconnect(websocket)


@router.websocket("/wss/detect_qr")
async def websocket_detect_qr_endpoint(
    websocket: WebSocket,
    verification_service: VerificationService = Depends(
        lambda: get_verification_service(
            flashcard_repo=get_flashcard_repository(),
            ar_object_repo=get_ar_object_repository()
        )
    )
):
    """
    WebSocket endpoint for real-time QR code detection and AR data retrieval.
    
    Expected message format:
    {
        "imageBase64": "base64_encoded_image"
    }
    
    Response format:
    {
        "type": "found",
        "qrId": "detected_qr_id",
        "arData": {...}
    }
    or
    {
        "type": "not_found"
    }
    """
    await ws_manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            image_base64 = message.get("imageBase64", "")
            if not image_base64:
                await ws_manager.send_error(websocket, "No image data provided")
                continue
            
            # Remove data URL prefix if present
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            
            try:
                # Decode base64 to BGR image
                frame_bgr = verification_service.decode_base64_to_bgr(image_base64)
                
                # Process frame to detect QR and fetch AR data
                result = await verification_service.process_qr_frame(frame_bgr)
                
                if result:
                    # QR code detected and AR data found
                    await ws_manager.send_json(websocket, result)
                else:
                    # No QR detected or no AR data found
                    await ws_manager.send_json(websocket, {"type": "not_found"})
            
            except Exception as e:
                logger.error(f"Error processing frame: {str(e)}")
                await ws_manager.send_error(websocket, f"Processing error: {str(e)}")
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("Client disconnected from /wss/detect_qr")
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        ws_manager.disconnect(websocket)
