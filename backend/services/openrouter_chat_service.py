"""
Shared constants for Lexi chat.
The streaming implementation now lives in agentic_rag_service.py (Planner ->
Generator -> Validator); this module only keeps the kid-safe fallback message
used when that pipeline fails end-to-end.
"""

KID_SAFE_FALLBACK = "Lexi đang bận một chút. Bé thử lại sau nhé!"
