from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Any, Dict
from services.ai_service import AIService, get_ai_service
from models.chat_model import ChatMessageSchema

router = APIRouter()

@router.post("/chat/message")
async def chat_message(
    message: str = Body(..., embed=True),
    context: str = Body("", embed=True),
    service: AIService = Depends(get_ai_service)
):
    response = await service.chat(message, context)
    return {"response": response}

@router.post("/chat/pronunciation")
async def analyze_pronunciation(
    target_text: str = Body(..., embed=True),
    audio_text: str = Body(..., embed=True), # In real app, upload audio file and transcribe
    service: AIService = Depends(get_ai_service)
):
    result = await service.analyze_pronunciation(target_text, audio_text)
    return result
