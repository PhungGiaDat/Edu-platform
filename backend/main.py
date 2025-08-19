from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from service.qr_service.router import router as qr_router # 👈 Import router từ module
from service.qr_service.websocket_router import router as ar_ws_router # 👈 Import WebSocket router

app = FastAPI(title="Eduplatform AR API")

#cấu hình CORS

# origins = [
#     "http://localhost:5173",  # React app
# ]

app.add_middleware(
CORSMiddleware,
    allow_origins=["*"],  # Phải là ["*"] để chấp nhận kết nối WebSocket trong dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CẤU HÌNH ĐÚNG CHO STATIC FILES ---

# 1. Cấu hình cho các tài sản AR (model, mind file)
# Khi client gọi "/assets/models/elephant cartoon.glb", 
# server sẽ tìm file trong thư mục "static/assets/models/elephant cartoon.glb"
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# 2. Cấu hình cho hình ảnh flashcard (để xác thực)
# Khi client gọi "/images/flashcard_elephant.png",
# server sẽ tìm file trong thư mục "static/images/flashcard_elephant.png"
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# 3. Cấu hình cho audio (nếu có)
# Khi client gọi "/audio/elephant.mp3",
# server sẽ tìm file trong thư mục "static/audio/elephant.mp3"
app.mount("/audio", StaticFiles(directory="static/audio"), name="audio")


# Gắn router của qr_service vào app
app.include_router(qr_router, prefix="/api", tags=["Flashcard"])

# Gắn WebSocket router - KHÔNG DÙNG PREFIX
# Bằng cách này, đường dẫn "/ws/verify" trong router sẽ được giữ nguyên
app.include_router(ar_ws_router, tags=["AR WebSocket"])