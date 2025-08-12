from fastapi import FastAPI
from service.qr_service.router import router as qr_router # 👈 Import router từ module
from service.ar_model.websocket_router import router as ar_ws_router # 👈 Import WebSocket router

app = FastAPI()

# Gắn router của qr_service vào app
app.include_router(qr_router, prefix="/api", tags=["Flashcard"])

# Gắn WebSocket router cho AR model detection
app.include_router(ar_ws_router, prefix="/api", tags=["AR WebSocket"])
