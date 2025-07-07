import cv2
import numpy as np
from pyzbar.pyzbar import decode
from typing import Optional
from ..repository.flashcard_repo import FlashcardRepository
from ..schemas.flashcard import FlashcardSchema

repo = FlashcardRepository()


def detect_qr_code(image_bytes: bytes) -> Optional[FlashcardSchema]:
    # Chuyển đổi bytes thành numpy array    
    nparr = np.frombuffer(image_bytes, np.uint8)
    # Đọc ảnh từ numpy array
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Giải mã QR code
    decoded_objects = decode(image)

    for obj in decoded_objects:
        qr_id = obj.data.decode('utf-8')
        result = repo.get_flashcard_by_qr_id(qr_id)
        if result:
            return FlashcardSchema(**result)
        
        return None
        



    
