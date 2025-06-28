# detect_qr_code.py

from load_model import load_model
from PIL import Image
from pyzbar.pyzbar import decode
import sqlite3
import time
import cv2

from load_model import load_model
from PIL import Image
from pyzbar.pyzbar import decode
import sqlite3
import time
import cv2

def detect_qr_code(image_path, db_path="yolo.db"):
    # 🧠 Load model YOLO (được định nghĩa riêng trong load_model.py)
    model = load_model()

    while True:
        try:
            # 📸 Dùng model để predict ảnh
            results = model(image_path)
            result = results[0]  # YOLO trả về list ảnh, lấy ảnh đầu tiên

            # 🖼️ Hiển thị ảnh gốc (không có bounding box overlay)
            cv_img = cv2.imread(image_path)
            cv2.imshow("Input Image", cv_img)
            cv2.waitKey(1)

            found_qr = False  # Đánh dấu nếu tìm thấy vùng chứa QR

            # 🔍 Duyệt qua tất cả bounding boxes được model detect ra
            for box in result.boxes.data:
                # 🧾 box.data chứa: [x1, y1, x2, y2, score, class_id]
                x1, y1, x2, y2, score, cls = box.tolist()

                # ✂️ Làm tròn lại cho tọa độ (để crop ảnh)
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])

                # 🔖 Lấy nhãn tương ứng từ class_id
                label = model.names[int(cls)]

                # ✅ Chỉ xử lý nếu nhãn là "qr_code"
                if label == "qr_code":
                    found_qr = True
                    print("📌 QR code detected!")

                    # ✂️ Crop vùng QR ra khỏi ảnh
                    img = Image.open(image_path)
                    qr_crop = img.crop((x1, y1, x2, y2))

                    # 🔍 Giải mã QR code bằng pyzbar
                    qr_data = decode(qr_crop)
                    if not qr_data:
                        print("❌ Không đọc được mã QR")
                        break  # Không xử lý tiếp nữa

                    # 📄 Lấy nội dung trong QR code (dạng text)
                    qr_text = qr_data[0].data.decode('utf-8')
                    print(f"📦 QR content: {qr_text}")

                    # 🧠 Truy vấn database SQLite để kiểm tra mã QR
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute("SELECT word FROM flashcards WHERE qr_code = ?", (qr_text,))
                    db_result = cursor.fetchone()
                    conn.close()

                    # 🟢 Hoặc 🔴 In kết quả
                    if db_result:
                        print(f"✅ Hợp lệ: từ khóa tương ứng là '{db_result[0]}'")
                    else:
                        print("❌ QR không có trong database")

                    break  # Dừng sau khi xử lý QR đầu tiên

            if not found_qr:
                print("⚠️ Không tìm thấy vùng QR")

        except Exception as e:
            print("🔥 Lỗi khi detect:", e)

        # 🕒 Delay giữa các lần chạy (tránh spam CPU)
        time.sleep(10)

        # 🧑 Nhập để tiếp tục / thoát
        user_input = input("Nhấn [Enter] để tiếp tục, 'q' để thoát: ")
        if user_input.lower() == 'q':
            print("👋 Thoát.")
            break



if __name__ == "__main__":
    detect_qr_code("flashcard_test.png")
