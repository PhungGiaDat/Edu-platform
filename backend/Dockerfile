# 1. BASE IMAGE: Chọn một base image Python gọn nhẹ
FROM python:3.10-slim

# 2. WORKDIR: Thiết lập thư mục làm việc mặc định trong container
WORKDIR /app

# 3. DEPENDENCIES: Sao chép file yêu cầu và cài đặt
# Bước này giúp tận dụng Docker cache: chỉ cài đặt lại nếu requirements.txt thay đổi
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. CODE: Sao chép toàn bộ source code FastAPI của bạn vào
# Giả sử thư mục code của bạn là /backend (Root Directory)
COPY . .

# 5. EXPOSE: Báo cho Docker biết cổng mà ứng dụng sẽ lắng nghe (mặc định cho Uvicorn/Gunicorn)
EXPOSE 8000

# 6. RUN CMD: Lệnh khởi động ứng dụng khi container chạy
# Sử dụng Gunicorn với Uvicorn worker là tốt nhất cho Production
# Thay thế 'main:app' bằng đường dẫn đến instance FastAPI của bạn (ví dụ: my_project.main:app)
CMD ["gunicorn", "main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]