from load_model import load_model
from PIL import Image
from pyzbar.pyzbar import decode
import sqlite3
import time
import cv2


def detect_qr_code(image_path, db_path="yolo.db"):
    model = load_model()

    while True:
        try:
            print(f"📷 Đang xử lý ảnh: {image_path}")
            results = model(image_path)[0]

            cv_img = cv2.imread(image_path)
            cv2.imshow("Input Image", cv_img)
            cv2.waitKey(500)

            found_qr = False

            print(f"🔍 Phát hiện {len(results.boxes)} vùng đối tượng")
            for i, box in enumerate(results.boxes.xyxy):
                x1, y1, x2, y2 = map(int, box.tolist())
                cls = int(results.boxes.cls[i])
                label = model.names[cls]
                print(f"🔍 Vùng {i+1}: {label} - Tọa độ: ({x1}, {y1}), ({x2}, {y2})")
                
                
                # Vẽ bounding box lên ảnh
                cv2.rectangle(cv_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(cv_img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                if label == "qr_code":
                    found_qr = True
                    print("📌 QR code detected!")
                    
                    pil_img = Image.open(image_path)
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    x2 = min(pil_img.width, x2)
                    y2 = min(pil_img.height, y2)
                    qr_crop = pil_img.crop((x1, y1, x2, y2))

                    qr_data = decode(qr_crop)
                    if not qr_data:
                        print("❌ Không đọc được mã QR")
                        break

                    qr_text = qr_data[0].data.decode('utf-8')
                    print(f"📦 QR content: {qr_text}")

                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute("SELECT word FROM flashcards WHERE qr_code = ?", (qr_text,))
                    db_result = cursor.fetchone()
                    conn.close()

                    if db_result:
                        print(f"✅ Hợp lệ: từ khóa tương ứng là '{db_result[0]}'")
                    else:
                        print("❌ QR không có trong database")

                    break

            if not found_qr:
                print("⚠️ Không tìm thấy vùng QR")

        except Exception as e:
            print("🔥 Lỗi khi detect:", e)

        time.sleep(5)  # Không để 0s, tránh đơ
        user_input = input("Nhấn [Enter] để tiếp tục, 'q' để thoát: ")
        if user_input.lower() == 'q':
            print("👋 Thoát.")
            break


if __name__ == "__main__":
    detect_qr_code("flashcard_test.png")
