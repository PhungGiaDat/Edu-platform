from fastapi import APIRouter, UploadFile,File , HTTPException
from fastapi.responses import JSONResponse
from .logic.detect_qr import detect_qr_code
from service.flashcards.repository.flashcard_repo import FlashcardRepository
from service.ar_assets.repository.ar_object_repo import ArObjectRepository
from service.ar_assets.repository.ar_combination_repo import ArCombinationRepository
from .schemas.models import FlashcardSchema,ARExperienceResponseSchema
import logging

router = APIRouter()
flashcard_repo = FlashcardRepository()
ar_object_repo = ArObjectRepository()
ar_combination_repo = ArCombinationRepository()
logger = logging.getLogger("uvicorn.debug")  # log ra console uvicorn

@router.post("/detect_qr", response_model=FlashcardSchema)
async def detect_qr_code_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith((".jpg", ".png", ".jpeg")):
        raise HTTPException(status_code=400, detail="Chỉ nhận ảnh PNG/JPG")

    image_bytes = await file.read()

    result = await detect_qr_code(image_bytes)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy flashcard phù hợp")

    return result



@router.get("/flashcard/{qr_id}", response_model=ARExperienceResponseSchema)
async def get_ar_experience_data(qr_id: str):
    """
    Cung cấp toàn bộ dữ liệu cần thiết cho trải nghiệm AR từ một QR ID,
    bao gồm thông tin flashcard, AR object chính và các combo liên quan.
    """
    logger.info(f"[SEARCH] [START] Fetching AR experience for QR ID: {qr_id}")

    # === Bước 1: Lấy `ar_tag` từ `flashcards` collection ===
    flashcard = await flashcard_repo.get_by_qr_id(qr_id)
    logger.info(f"[CARD] Flashcard fetched: {flashcard}")

    if not flashcard or not flashcard.get("ar_tag"):
        logger.error(f"❌ Flashcard not found for QR ID: {qr_id}")
        raise HTTPException(status_code=404, detail=f"Không tìm thấy Flashcard với QR ID '{qr_id}'")
    
    ar_tag = flashcard["ar_tag"]
    logger.info(f"[TARGET] Extracted ar_tag: {ar_tag}")

    # === Bước 2: Lấy dữ liệu AR cho thẻ đơn từ `ar_objects` collection ===
    target_ar_object = await ar_object_repo.get_by_tag(ar_tag)
    logger.info(f"[AR] Target AR Object fetched: {target_ar_object}")

    if not target_ar_object:
        logger.error(f"❌ AR Object not found for tag: {ar_tag}")
        raise HTTPException(status_code=404, detail=f"Không tìm thấy AR Object với tag '{ar_tag}'")
        
    # === Bước 3: Tìm các combo liên quan từ `ar_combinations` collection ===
    related_combos = await ar_combination_repo.find_by_tag(ar_tag)
    logger.info(f"[COMBO] Related combos found: {related_combos}")

    # === Bước 4: Tổng hợp và trả về response ===
    response = {
        "flashcard": flashcard,
        "target": target_ar_object,
        "related_combos": related_combos
    }

    logger.info(f"✅ Final API response: {response}")
    return response
