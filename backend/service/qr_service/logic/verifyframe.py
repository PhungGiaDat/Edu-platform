import cv2
import numpy as np 
import base64
import os 

from pathlib import Path


STATIC_PATH = Path(__file__).resolve().parent.parent / "static"

def decode_base64_to_bgr(b64_string:str) ->np.ndarray:
    """Decode a base64 string to a BGR image."""
    image_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(image_data, np.uint8)
    
    # cv2.IMREAD_COLOR sẽ decode ra BGR
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Failed to decode base64 string to image")
    return image


def map_url_to_path(url:str ) -> str:
    """Converts a URL like '/images/a.png' to a full system path"""
    # Bỏ dấu / ở đầu 
    if url.startswith("/"):
        url = url[1:]
    return os.path.join(STATIC_PATH, url)

async def verify_frame(frame_bgr: np.ndarray, card_ref_path: str) -> tuple[bool, float]:
    """
    Verifies if the captured frame contains the reference flashcard image
    using ORB feature matching.
    """
    card_ref_path_full = map_url_to_path(card_ref_path)
    if not os.path.exists(card_ref_path_full):
        print(f"Reference image not found at: {card_ref_path_full}")
        return False, 0.0

    ref_img = cv2.imread(card_ref_path_full, cv2.IMREAD_GRAYSCALE)
    frame_gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    if ref_img is None:
        return False, 0.0

    # 1. Khởi tạo ORB detector
    orb = cv2.ORB_create(nfeatures=1000)
    kp1, des1 = orb.detectAndCompute(ref_img, None)
    kp2, des2 = orb.detectAndCompute(frame_gray, None)

    if des1 is None or des2 is None or len(des1) < 2 or len(des2) < 2:
        return False, 0.0

    # 2. Matching
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    matches = sorted(matches, key=lambda x: x.distance)

    # 3. Lọc các match tốt
    # Ngưỡng distance càng thấp, match càng chính xác. 45-55 là khoảng tốt cho ORB.
    good_matches = [m for m in matches if m.distance < 50]

    # 4. Tính toán confidence
    # Cần ít nhất 20-30 điểm match tốt để coi là khớp.
    # Tỷ lệ confidence = số điểm khớp / số điểm cần thiết
    required_matches = 40
    confidence = min(1.0, len(good_matches) / required_matches)
    is_valid = confidence > 0.6 # Ngưỡng xác thực > 60%

    return is_valid, round(confidence, 2)