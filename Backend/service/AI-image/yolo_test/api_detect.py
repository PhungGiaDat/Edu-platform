from fastapi import FastAPI, HTTPException,APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
import shutil
from pathlib import Path


router = APIRouter()


Upload_directory = Path(__file__).resolve().parent / "yolo-test"


@router.post("/detect")
async def detect_qr_image(image: UploadFile = File(...)):
    save_path = Upload_directory / image.filename

    with save_path.open("wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    return {"message": f"🖼️ Đã nhận file và lưu tại {save_path.name}"}
