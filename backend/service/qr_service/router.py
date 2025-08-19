from fastapi import APIRouter, UploadFile,File , HTTPException
from fastapi.responses import JSONResponse
from .logic.detect_qr import detect_qr_code
from service.qr_service.repository.flashcard_repo import FlashcardRepository
from service.ar_model.repository.ar_object_repo import ArObjectRepository
from .schemas.models import FlashcardSchema
from database.mongodb import MongoDBConnector

router = APIRouter()
flashcard_repo = FlashcardRepository()
ar_object_repo = ArObjectRepository()

@router.post("/detect_qr", response_model=FlashcardSchema)
async def detect_qr_code_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith((".jpg", ".png", ".jpeg")):
        raise HTTPException(status_code=400, detail="Chỉ nhận ảnh PNG/JPG")

    image_bytes = await file.read()

    result = await detect_qr_code(image_bytes)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy flashcard phù hợp")

    return result



@router.get("/flashcard/{qr_id}", response_model=FlashcardSchema)
async def get_flashcard_with_ar(qr_id: str):
    print(f"[DEBUG] 🔍 Finding flashcard with qr_id: {qr_id}")
    
    flashcard = await flashcard_repo.get_by_qr_id(qr_id)
    
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    print(f"[DEBUG] ✅ Found flashcard: {flashcard}")
    
    # Lấy ar_tag nếu có
    ar_tag = flashcard.get("ar_tag")
    if ar_tag:
        ar_object = await ar_object_repo.get_by_tag(ar_tag)
        if ar_object:
            flashcard["ar_object"] = ar_object
            print(f"[DEBUG] 🧩 AR Object found: {ar_object}")
    
    # Đây có thể là chỗ lỗi: schema không khớp với flashcard dict
    try:
        return FlashcardSchema(**flashcard)
    except Exception as e:
        print(f"[ERROR] ❌ Schema conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi schema: {e}")


