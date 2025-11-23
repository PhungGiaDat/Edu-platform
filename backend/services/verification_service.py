"""
Verification Service - Business logic for frame verification and QR detection
"""
import base64
import cv2
import numpy as np
from typing import Optional, Dict, Any
from pathlib import Path

from repositories.flashcard_repository import FlashcardRepository
from repositories.ar_object_repository import ARObjectRepository
from services.flashcard_service import detect_qr_code  # Import existing QR detection


class VerificationService:
    """Service handling frame verification and QR detection logic"""
    
    STATIC_PATH = Path(__file__).resolve().parent.parent / "static"
    
    def __init__(
        self,
        flashcard_repo: FlashcardRepository,
        ar_object_repo: ARObjectRepository
    ):
        self.flashcard_repo = flashcard_repo
        self.ar_object_repo = ar_object_repo
    
    @staticmethod
    def decode_base64_to_bgr(b64_string: str) -> np.ndarray:
        """Decode a base64 string to a BGR image."""
        image_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(image_data, np.uint8)
        
        # cv2.IMREAD_COLOR will decode to BGR
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode base64 string to image")
        return image
    
    def _map_url_to_path(self, url: str) -> str:
        """Converts a URL like '/images/a.png' to a full system path"""
        # Remove leading slash
        if url.startswith("/"):
            url = url[1:]
        return str(self.STATIC_PATH / url)
    
    async def verify_frame(self, frame_bgr: np.ndarray, card_ref_path: str) -> tuple[bool, float]:
        """
        Verifies if the captured frame contains the reference flashcard image
        using ORB feature matching.
        
        Returns:
            tuple[bool, float]: (is_valid, confidence_score)
        """
        card_ref_path_full = self._map_url_to_path(card_ref_path)
        
        # Check if reference image exists
        if not Path(card_ref_path_full).exists():
            print(f"Reference image not found at: {card_ref_path_full}")
            return False, 0.0
        
        # Read reference image
        ref_img = cv2.imread(card_ref_path_full, cv2.IMREAD_GRAYSCALE)
        frame_gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        
        if ref_img is None:
            return False, 0.0
        
        # 1. Initialize ORB detector
        orb = cv2.ORB_create(nfeatures=1000)
        kp1, des1 = orb.detectAndCompute(ref_img, None)
        kp2, des2 = orb.detectAndCompute(frame_gray, None)
        
        if des1 is None or des2 is None or len(des1) < 2 or len(des2) < 2:
            return False, 0.0
        
        # 2. Feature matching
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # 3. Filter good matches
        # Lower distance threshold = more accurate match (45-55 is good range for ORB)
        good_matches = [m for m in matches if m.distance < 50]
        
        # 4. Calculate confidence
        # Need at least 40 good match points to consider it a match
        # Confidence = number of matched points / required matches
        required_matches = 40
        confidence = min(1.0, len(good_matches) / required_matches)
        is_valid = confidence > 0.6  # Validation threshold > 60%
        
        return is_valid, round(confidence, 2)
    
    async def process_qr_frame(self, frame_bgr: np.ndarray) -> Optional[Dict[str, Any]]:
        """
        Process a frame to detect QR codes and fetch AR data.
        
        Returns:
            Optional[Dict]: AR data in MindAR response format or None if no QR detected
        """
        # Detect QR code in frame
        qr_data = detect_qr_code(frame_bgr)
        if not qr_data:
            return None
        
        qr_id = qr_data.get("data")
        if not qr_id:
            return None
        
        # Fetch AR data from repository
        ar_data = await self.ar_object_repo.get_by_qr_id(qr_id)
        if not ar_data:
            return None
        
        # Format response in MindAR format
        return {
            "type": "found",
            "qrId": qr_id,
            "arData": ar_data
        }


def get_verification_service(
    flashcard_repo: FlashcardRepository,
    ar_object_repo: ARObjectRepository
) -> VerificationService:
    """Factory function for dependency injection"""
    return VerificationService(flashcard_repo, ar_object_repo)
