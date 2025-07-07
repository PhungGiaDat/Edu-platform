from fastapi import FastAPI
from service.qr_service.router import router as qr_router  # 👈 Import router từ module

app = FastAPI()

# Gắn router của qr_service vào app
app.include_router(qr_router, prefix="/api", tags=["Flashcard"])
