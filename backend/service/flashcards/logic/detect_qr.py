import cv2
import numpy as np
from pyzbar.pyzbar import decode
from typing import Optional

from ..repository.flashcard_repo import FlashcardRepository
from service.ar_assets.repository.ar_object_repo import ArObjectRepository
from ..schemas.models import FlashcardSchema

# Khởi tạo repo
flashcard_repo = FlashcardRepository()
ar_object_repo = ArObjectRepository()

async def detect_qr_code(image_bytes: bytes) -> Optional[FlashcardSchema]:
    # B1: Chuyển ảnh bytes ➜ numpy
    nparr = np.frombuffer(image_bytes, np.uint8)
    print(f"[DEBUG] [IMG] Image bytes converted to numpy array of shape: ({', '.join(map(str, nparr.shape))})")
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    print(f"[DEBUG] [FRAME]️ Image decoded with shape: {image.shape if image is not None else 'None'}")

    # B2: Decode QR code
    if image is None:
        print("[ERROR] ❌ Failed to decode image from bytes")
        return None
    decoded_objects = decode(image)
    print(f"[DEBUG] [SEARCH] Decoded {len(decoded_objects)} QR codes from image")

    if not decoded_objects:
        return None  # Không tìm thấy QR
    print(f"[DEBUG] [DATA] Found QR code with data: {decoded_objects[0].data.decode('utf-8')}")

    # B3: Giả sử lấy QR đầu tiên
    qr_id = decoded_objects[0].data.decode('utf-8')
    print(f"[DEBUG] 🆔 QR ID extracted: {qr_id}")

    # B4: Truy vấn Flashcard theo qr_id
    flashcard = await flashcard_repo.get_by_qr_id(qr_id)
    print(f"[DEBUG] 🔎 Flashcard found: {flashcard}")
    if not flashcard:
        return None
    print(f"[DEBUG] ✅ Flashcard successfully retrieved with ID: {flashcard.get('qr_id')}")

    # B5: Nếu có ar_tag ➜ truy tiếp ar_object
    ar_tag = flashcard.get("ar_tag")
    print(f"[DEBUG] [TAG]️ AR Tag found: {ar_tag}")
    if ar_tag:
        ar_object = await ar_object_repo.get_by_tag(ar_tag)
        print(f"[DEBUG] [COMBO] AR Object retrieved: {ar_object}")
        if ar_object:
            flashcard["ar_object"] = ar_object
            print(f"[DEBUG] [COMBO] AR Object found: {ar_object}")

    # B6: Trả về schema
  
    return FlashcardSchema(**flashcard)
    
