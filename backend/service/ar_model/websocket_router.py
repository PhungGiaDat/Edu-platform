from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

from .logic.websocket_qr_detector import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/wss/detect_qr")
async def websocket_qr_detection(websocket: WebSocket):
    """
    WebSocket endpoint for real-time QR code detection
    
    Expected message format from client:
    {
        "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
    }
    
    Response format:
    {
        "success": true,
        "qr_id": "ele123",
        "mind_file_url": "https://example.com/mind/elephant.mind",
        "targets": [
            {
                "targetId": 0,
                "model_url": "https://example.com/models/elephant.glb",
                "scale": "0.5 0.5 0.5",
                "position": "0 0 0",
                "rotation": "0 0 0",
                "tag": "elephant",
                "description": "3D Elephant Model"
            }
        ]
    }
    """
    await ws_manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                # Parse JSON message
                message = json.loads(data)
                logger.info(f"Received WebSocket message: {message.keys()}")
                
                # Process the frame
                await ws_manager.process_frame(websocket, message)
                
            except json.JSONDecodeError:
                await ws_manager.send_error(websocket, "Invalid JSON format")
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                await ws_manager.send_error(websocket, f"Processing error: {str(e)}")
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        ws_manager.disconnect(websocket)
