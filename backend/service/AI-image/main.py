from fastapi import FastAPI
from yolo_test import api_detect

app = FastAPI()

# Mount router
app.include_router(api_detect.router)
