from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
from .logic.verifyframe import *
from .logic.websocket_qr_detector import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/qr/verify")
async def websocket_verify_frame_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    verification_count = {}  # Track verification attempts per QR ID

    try:
        while True:
            data_str = await websocket.receive_text()
            payload = json.loads(data_str)
            
            qr_id = payload.get("qr_id")
            img_base64 = payload.get("imageBase64")

            if not qr_id or not img_base64:
                continue
    
            # Track verification attempts to prevent infinite loops
            if qr_id not in verification_count:
                verification_count[qr_id] = 0
            verification_count[qr_id] += 1
            
            # Decode frame 
            frame = decode_base64_to_bgr(img_base64)
            
            # Lấy thông tin flashcard để có img_url tham chiếu 
            fc = await ws_manager.flashcard_repo.get_by_qr_id(qr_id)
            if not fc:
                await websocket.send_json({
                    "qr_id": qr_id,
                    "valid": False,
                    "confidence": 0,
                    "success": False,
                    "error": "Flashcard not found"
                })
                continue
                
            # THỰC HIỆN XÁC THỰC với retry logic
            is_valid, confidence = await verify_frame(frame, fc["image_url"])
            
            # Thêm tolerance cho lần verify đầu tiên hoặc khi có confidence hợp lý
            tolerance_threshold = 0.3
            if not is_valid and confidence > tolerance_threshold and verification_count[qr_id] <= 3:
                is_valid = True
                logger.info(f"Verification passed with tolerance: confidence={confidence}, attempt={verification_count[qr_id]}")

            # Nếu thất bại quá nhiều lần, chỉ gửi 1 lần nữa rồi dừng
            if not is_valid and verification_count[qr_id] > 5:
                logger.warning(f"Too many failed verifications for {qr_id}, limiting responses")
                # Reset counter after sending final response
                verification_count[qr_id] = 0
                is_valid = False  # Force failure to stop the loop

            await websocket.send_json({
                "qr_id": qr_id,
                "valid": is_valid,
                "confidence": confidence,
                "success": is_valid,
                "reason": "matched by feature" if is_valid else f"not matched (confidence: {confidence}, attempt: {verification_count[qr_id]})"
            })

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
        print("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        print(f"WebSocket error: {str(e)}")
        await websocket.close(code=1011)


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
