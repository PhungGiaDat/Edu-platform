# 🚀 Backend Refactoring Guide - Migration Plan

## 📋 Overview
This guide helps you migrate from the old feature-based structure to the new Clean Architecture.

---

## 🏗️ New Structure

```
/backend
├── settings.py           ✅ Centralized config (Pydantic)
├── main.py              ✅ New main entry point
├── main_new.py          📝 Use this temporarily
│
├── core/                 ✅ Abstract base classes
│   ├── base_repository.py
│   └── base_router.py
│
├── database/            ✅ Database connection only
│   └── connection.py
│
├── repositories/        ✅ Data access layer
│   ├── flashcard_repository.py
│   ├── ar_object_repository.py
│   ├── ar_combination_repository.py
│   ├── quiz_repository.py
│   └── game_repository.py
│
├── models/              ✅ Pydantic schemas
│   ├── flashcard.py
│   ├── ar_object.py
│   ├── ar_combination.py
│   ├── ar_experience.py
│   ├── quiz.py
│   └── game.py
│
├── services/            ✅ Business logic
│   ├── flashcard_service.py
│   ├── ar_service.py
│   ├── quiz_service.py
│   └── game_service.py
│
├── api/                 ✅ Thin API routers
│   ├── flashcards.py
│   ├── quiz.py
│   └── game.py
│
└── service/             ⚠️ OLD - Keep for WebSocket only
    └── flashcards/
        └── websocket_router.py
```

---

## 🔄 Migration Steps

### Step 1: Test New Structure (Parallel Running)

```bash
# Keep old main.py
cp main.py main_old.py

# Test new structure
python main_new.py

# OR with Uvicorn
uvicorn main_new:app --reload --port 8001
```

### Step 2: Verify Endpoints

Test these endpoints:

```bash
# Health check
curl http://localhost:8001/health

# Flashcard (old: /api/flashcard/{qr_id})
curl http://localhost:8001/api/flashcard/ele123

# Quiz (old: /api/quiz/{qr_id})
curl http://localhost:8001/api/quiz/ele123

# Game (old: /api/game/{qr_id})
curl http://localhost:8001/api/game/ele123?difficulty=easy
```

### Step 3: Update Frontend API Calls

**Before:**
```typescript
const response = await fetch(`${API_BASE}/api/flashcard/${qrId}`);
```

**After (same URL, no change needed!):**
```typescript
const response = await fetch(`${API_BASE}/api/flashcard/${qrId}`);
```

✅ **URLs are identical! No frontend changes needed.**

### Step 4: Switch to New Main

```bash
# Backup old main
mv main.py main_old_backup.py

# Activate new main
mv main_new.py main.py

# Restart server
uvicorn main:app --reload
```

### Step 5: Update Environment Variables

Ensure your `.env` has:

```env
# Required
MONGO_URL=mongodb+srv://...
MONGO_DB=eduplatform

# Optional (has defaults)
SECRET_KEY=your-secret-key
DEBUG=false
ALLOWED_ORIGINS=*
HOST=0.0.0.0
PORT=8000
```

---

## 🧪 Testing Checklist

- [ ] `/health` endpoint returns healthy status
- [ ] Flashcard API works
- [ ] Quiz API works
- [ ] Game API works
- [ ] WebSocket connection works
- [ ] Static files load (images, models, audio)
- [ ] CORS works with frontend
- [ ] Database connection stable

---

## 🐛 Troubleshooting

### Import Errors

```python
# If you see: ModuleNotFoundError: No module named 'repositories'
# Solution: Make sure you're in /backend directory
cd /path/to/backend
python main.py
```

### Settings Not Loading

```python
# If you see: "MONGO_URL environment variable is required"
# Solution: Check .env file exists and has MONGO_URL
cat .env | grep MONGO_URL
```

### Old Routes Still Used

```bash
# Check which main.py is running
ps aux | grep python | grep main
# Kill old process if needed
pkill -f "main_old.py"
```

---

## 📦 Render Deployment

### Option 1: Use render.yaml (Recommended)

1. Push code to GitHub
2. Connect repo to Render
3. Render auto-detects `render.yaml`
4. Set `MONGO_URL` in Render dashboard
5. Deploy!

### Option 2: Manual Setup

1. Create new Web Service on Render
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `gunicorn main:app --bind 0.0.0.0:$PORT --workers 4 --worker-class uvicorn.workers.UvicornWorker`
4. **Environment Variables:**
   - `MONGO_URL` = your MongoDB connection string
   - `MONGO_DB` = `eduplatform`
   - `SECRET_KEY` = auto-generate
   - `DEBUG` = `false`
5. Deploy!

---

## 🗑️ Cleanup (After Successful Migration)

```bash
# Remove old structure (DO THIS CAREFULLY!)
rm -rf service/  # Keep service/flashcards/websocket_router.py
rm main_old_backup.py
rm database/mongodb.py
rm database/mongo_config.py
rm database/base_repo.py
```

---

## 📚 Benefits of New Structure

1. ✅ **Clear separation of concerns** (Router → Service → Repository)
2. ✅ **Easy to test** (mock services, not databases)
3. ✅ **Scalable** (add new features without touching existing code)
4. ✅ **Type-safe** (Pydantic models everywhere)
5. ✅ **Production-ready** (proper error handling, logging, health checks)
6. ✅ **Render-optimized** (Dockerfile, render.yaml included)

---

## 🆘 Need Help?

If you encounter issues:

1. Check logs: `tail -f /path/to/logs/app.log`
2. Enable debug: Set `DEBUG=true` in `.env`
3. Test health endpoint: `curl http://localhost:8000/health`
4. Check database connection: Look for "✅ Database connected" in logs

---

**Good luck with the migration! 🚀**
