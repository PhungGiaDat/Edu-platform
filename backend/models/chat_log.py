# backend/models/chat_log.py
"""
ChatLog Models - PostgreSQL via repositories

Stores RAG chat history for analytics and AI response improvement.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
