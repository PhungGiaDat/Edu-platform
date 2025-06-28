from fastapi import FastAPI
from service.ai_image.yolo_test import api_detect

app = FastAPI()

# Gắn router detect
app.include_router(api_detect.router)