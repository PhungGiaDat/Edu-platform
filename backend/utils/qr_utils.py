"""
QR Code Utilities - Shared functions for QR detection and processing
"""
from typing import Optional, Dict
import numpy as np
from pyzbar.pyzbar import decode


def detect_qr_code(image: np.ndarray) -> Optional[Dict[str, str]]:
    """
    Detect QR code from image frame
    
    Args:
        image: BGR image as numpy array
    
    Returns:
        Dict with QR data or None if no QR detected
    """
    if image is None:
        return None
    
    # Decode QR codes from image
    decoded_objects = decode(image)
    
    if not decoded_objects:
        return None
    
    # Return first QR code found
    qr_data = decoded_objects[0].data.decode('utf-8')
    return {"data": qr_data}
