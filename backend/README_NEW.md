# 🎓 Eduplatform AR API - Backend

**Clean Architecture FastAPI Backend for Educational AR Platform**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://mongodb.com)

---

## 📖 Overview

Educational AR platform backend providing:
- 📇 **Flashcard Management** with AR markers
- 🎮 **Mini Games** (Drag Match, Word Scramble, Memory Match)
- 📝 **Quizzes** with multiple question types
- 🔄 **Real-time Verification** via WebSocket

---

## 🏗️ Architecture

```
Clean Architecture Pattern:
┌─────────────────────────────────────┐
│         API Layer (Routers)         │  ← Thin HTTP handlers
├─────────────────────────────────────┤
│       Service Layer (Logic)         │  ← Business rules
├─────────────────────────────────────┤
│    Repository Layer (Data Access)   │  ← Database operations
├─────────────────────────────────────┤
│         Database (MongoDB)          │  ← Data storage
└─────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- MongoDB Atlas account
- pip or poetry

### Installation

```bash
# Clone repository
git clone <repo-url>
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB connection string
```

### Run Development Server

```bash
# Start server
uvicorn main:app --reload --port 8000

# Or with Python
python main.py
```

API will be available at: http://localhost:8000

Swagger docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
backend/
├── main.py                 # Application entry point
├── settings.py             # Centralized configuration
│
├── api/                    # API routers (thin layer)
│   ├── flashcards.py
│   ├── quiz.py
│   └── game.py
│
├── services/               # Business logic
│   ├── flashcard_service.py
│   ├── ar_service.py
│   ├── quiz_service.py
│   └── game_service.py
│
├── repositories/           # Data access layer
│   ├── flashcard_repository.py
│   ├── ar_object_repository.py
│   ├── ar_combination_repository.py
│   ├── quiz_repository.py
│   └── game_repository.py
│
├── models/                 # Pydantic schemas
│   ├── flashcard.py
│   ├── ar_experience.py
│   ├── quiz.py
│   └── game.py
│
├── database/               # Database connection
│   └── connection.py
│
├── core/                   # Base classes
│   ├── base_repository.py
│   └── base_router.py
│
└── static/                 # Static assets
    ├── assets/             # 3D models, NFT markers
    ├── images/             # Flashcard images
    └── audio/              # Audio files
```

---

## 🔌 API Endpoints

### Flashcards

```http
GET  /api/flashcard/{qr_id}           # Get AR experience (flashcard + AR + combos)
GET  /api/flashcard/category/{name}   # Get flashcards by category
GET  /api/flashcard/search/{query}    # Search flashcards
```

### Quiz

```http
GET  /api/quiz/{qr_id}                # Get quiz for flashcard
```

### Games

```http
GET  /api/game/{qr_id}                # Get game for flashcard
     ?game_type=drag_match            # Filter by game type
     &difficulty=easy                 # Filter by difficulty
```

### System

```http
GET  /health                          # Health check
GET  /                                # API info
```

### WebSocket

```
WS   /ws/qr/verify                    # Real-time frame verification
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Required
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
MONGO_DB=eduplatform

# Optional
SECRET_KEY=your-secret-key
DEBUG=false
ALLOWED_ORIGINS=*
HOST=0.0.0.0
PORT=8000
```

### Settings.py

Centralized configuration using Pydantic Settings:

```python
from settings import settings

print(settings.MONGO_DB)      # Access config
print(settings.cors_origins)  # Parsed CORS origins
```

---

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t eduplatform-api .
```

### Run Container

```bash
docker run -d \
  -p 8000:8000 \
  -e MONGO_URL="mongodb+srv://..." \
  -e MONGO_DB="eduplatform" \
  --name eduplatform-api \
  eduplatform-api
```

---

## ☁️ Render Deployment

### Option 1: Auto-deploy with render.yaml

1. Push code to GitHub
2. Connect repo to Render
3. Render auto-detects `render.yaml`
4. Set `MONGO_URL` in dashboard
5. Deploy! 🚀

### Option 2: Manual Setup

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
gunicorn main:app --bind 0.0.0.0:$PORT --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

**Environment Variables:**
- `MONGO_URL` (required)
- `MONGO_DB` = `eduplatform`
- `SECRET_KEY` = auto-generate
- `DEBUG` = `false`

---

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test flashcard API
curl http://localhost:8000/api/flashcard/ele123

# Run with debug mode
DEBUG=true uvicorn main:app --reload
```

---

## 📚 Dependencies

Core:
- **FastAPI** - Modern web framework
- **Pydantic** - Data validation
- **Motor** - Async MongoDB driver
- **Uvicorn** - ASGI server
- **Gunicorn** - Production server

Additional:
- **python-multipart** - File uploads
- **opencv-python** - Image processing
- **pillow** - Image handling
- **certifi** - SSL certificates

---

## 🔐 Security

- ✅ Non-root user in Docker
- ✅ Environment-based secrets
- ✅ CORS configuration
- ✅ Input validation (Pydantic)
- ✅ Health check endpoint
- ✅ Production-ready error handling

---

## 📈 Performance

- **Async/Await** - Non-blocking I/O
- **Connection Pooling** - MongoDB connection reuse
- **Static File Serving** - Efficient asset delivery
- **Gunicorn + Uvicorn** - Multi-worker production setup

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Team

**Eduplatform Development Team**

---

## 📞 Support

For issues and questions:
- GitHub Issues: [Create Issue](#)
- Documentation: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

**Made with ❤️ for education**
