from ultralytics import YOLO

## load model có sẵn từ Yolo 


def load_model():
    model = YOLO("yolov8n.pt")
    return model 



    