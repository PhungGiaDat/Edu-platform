# backend/api/admin.py
"""
Admin API Router - Teacher Admin Dashboard Endpoints
All endpoints are scoped to the authenticated teacher
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from typing import Optional, List, Any
from datetime import datetime

from core.security import get_current_user, get_current_active_superuser, get_current_teacher
from models.user_mongo import UserDocument
from models.admin_models import (
    DashboardStats,
    FlashcardDeckCreate,
    FlashcardDeckUpdate,
    FlashcardDeckResponse,
    AdminFlashcardCreate,
    AdminFlashcardUpdate,
    AdminFlashcardResponse,
    AdminCourseCreate,
    AdminCourseUpdate,
    AdminCourseResponse,
    StudentProgressResponse,
    LearningGoalCreate,
    LearningGoalResponse,
    PaginatedResponse,
)
from repositories.admin_repository import AdminRepository, get_admin_repository
from services.flashcard_upload_service import get_flashcard_upload_service
from models.ar_object_contract import ARObjectConfigurationError
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def get_admin_repo(
    current_user: UserDocument = Depends(get_current_teacher)
) -> AdminRepository:
    """Dependency to get admin repository scoped to current user"""
    return AdminRepository(teacher_id=str(current_user.id))


# ========== Dashboard ==========

@router.get("/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Get dashboard statistics for the current teacher
    
    Returns:
    - Total students, courses, flashcards, decks
    - Active sessions
    - Average progress
    - Top students
    """
    logger.info(f"[Admin] GET /admin/dashboard")
    
    try:
        stats = await repo.get_dashboard_stats()
        return DashboardStats(**stats)
    except Exception as e:
        logger.error(f"[Admin] Dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard statistics"
        )


# ========== Courses ==========

@router.get("/courses", response_model=PaginatedResponse)
async def get_teacher_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Get all courses for the current teacher
    
    Args:
        skip: Number of courses to skip
        limit: Max courses to return
    
    Returns:
        Paginated list of courses
    """
    logger.info(f"[Admin] GET /admin/courses?skip={skip}&limit={limit}")
    
    courses, total = await repo.get_courses(skip=skip, limit=limit)
    
    return PaginatedResponse(
        items=courses,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(courses)) < total
    )


@router.get("/courses/{course_id}", response_model=AdminCourseResponse)
async def get_teacher_course(
    course_id: str,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Get a specific course by ID"""
    logger.info(f"[Admin] GET /admin/courses/{course_id}")
    
    course = await repo.get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    return AdminCourseResponse(**course)


@router.post("/courses", response_model=AdminCourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: AdminCourseCreate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Create a new course
    
    The course will be associated with the current teacher
    """
    logger.info(f"[Admin] POST /admin/courses - Creating course: {course_data.title}")
    
    try:
        course = await repo.create_course(course_data.model_dump())
        return AdminCourseResponse(**course)
    except Exception as e:
        logger.error(f"[Admin] Course creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create course"
        )


@router.put("/courses/{course_id}", response_model=AdminCourseResponse)
async def update_course(
    course_id: str,
    course_data: AdminCourseUpdate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Update a course
    
    Only the owning teacher can update their courses
    """
    logger.info(f"[Admin] PUT /admin/courses/{course_id}")
    
    # Check if course exists
    existing = await repo.get_course_by_id(course_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    try:
        update_dict = {k: v for k, v in course_data.model_dump().items() if v is not None}
        success = await repo.update_course(course_id, update_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update course"
            )
        
        return await repo.get_course_by_id(course_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Admin] Course update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update course"
        )


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Delete a course
    
    Only the owning teacher can delete their courses
    """
    logger.info(f"[Admin] DELETE /admin/courses/{course_id}")
    
    success = await repo.delete_course(course_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or already deleted"
        )


# ========== Flashcard Decks ==========

@router.get("/flashcards/decks", response_model=PaginatedResponse)
async def get_flashcard_decks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Get all flashcard decks for the current teacher"""
    logger.info(f"[Admin] GET /admin/flashcards/decks?skip={skip}&limit={limit}")
    
    decks, total = await repo.get_decks(skip=skip, limit=limit)
    
    return PaginatedResponse(
        items=decks,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(decks)) < total
    )


@router.post("/flashcards/decks", response_model=FlashcardDeckResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard_deck(
    deck_data: FlashcardDeckCreate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Create a new flashcard deck"""
    logger.info(f"[Admin] POST /admin/flashcards/decks - Creating deck: {deck_data.name}")
    
    try:
        deck = await repo.create_deck(deck_data.model_dump())
        return FlashcardDeckResponse(**deck)
    except Exception as e:
        logger.error(f"[Admin] Deck creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create deck"
        )


@router.put("/flashcards/decks/{deck_id}", response_model=FlashcardDeckResponse)
async def update_flashcard_deck(
    deck_id: str,
    deck_data: FlashcardDeckUpdate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Update a flashcard deck"""
    logger.info(f"[Admin] PUT /admin/flashcards/decks/{deck_id}")
    
    update_dict = {k: v for k, v in deck_data.model_dump().items() if v is not None}
    success = await repo.update_deck(deck_id, update_dict)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    deck = await repo.get_deck_by_id(deck_id)
    return FlashcardDeckResponse(**deck)


@router.delete("/flashcards/decks/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard_deck(
    deck_id: str,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Soft delete a flashcard deck"""
    logger.info(f"[Admin] DELETE /admin/flashcards/decks/{deck_id}")
    
    success = await repo.delete_deck(deck_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )


# ========== Flashcards ==========

@router.get("/flashcards/decks/{deck_id}/cards", response_model=PaginatedResponse)
async def get_flashcards_in_deck(
    deck_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Get all flashcards in a specific deck"""
    logger.info(f"[Admin] GET /admin/flashcards/decks/{deck_id}/cards?skip={skip}&limit={limit}")
    
    # Verify deck belongs to teacher
    deck = await repo.get_deck_by_id(deck_id)
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    flashcards, total = await repo.get_flashcards(deck_id=deck_id, skip=skip, limit=limit)
    
    return PaginatedResponse(
        items=flashcards,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(flashcards)) < total
    )


@router.post("/flashcards/decks/{deck_id}/cards", response_model=AdminFlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard_in_deck(
    deck_id: str,
    card_data: AdminFlashcardCreate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Add a flashcard to a deck"""
    logger.info(f"[Admin] POST /admin/flashcards/decks/{deck_id}/cards")
    
    # Verify deck belongs to teacher
    deck = await repo.get_deck_by_id(deck_id)
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    card_dict = card_data.model_dump()
    card_dict["deck_id"] = deck_id
    
    try:
        card = await repo.create_flashcard(card_dict)
        return AdminFlashcardResponse(**card)
    except ARObjectConfigurationError as exc:
        # AR configuration failures are operator mistakes (missing or invalid
        # AR object), not server faults. Map to 422 so the admin UI can
        # surface a precise remediation hint without leaking stack traces.
        logger.info(f"[Admin] Flashcard rejected — {exc}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Admin] Flashcard creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create flashcard"
        )


@router.put("/flashcards/cards/{qrId}", response_model=AdminFlashcardResponse)
async def update_flashcard(
    qrId: str,
    card_data: AdminFlashcardUpdate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Update a flashcard"""
    logger.info(f"[Admin] PUT /admin/flashcards/cards/{qrId}")
    
    update_dict = {k: v for k, v in card_data.model_dump().items() if v is not None}
    success = await repo.update_flashcard(qrId, update_dict)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )
    
    card = await repo.get_flashcard_by_id(qrId)
    return AdminFlashcardResponse(**card)


@router.delete("/flashcards/cards/{qrId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard(
    qrId: str,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Delete a flashcard"""
    logger.info(f"[Admin] DELETE /admin/flashcards/cards/{qrId}")

    success = await repo.delete_flashcard(qrId)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )


@router.post(
    "/flashcards/upload-image",
    status_code=status.HTTP_201_CREATED,
    summary="Upload flashcard artwork (dual PNG: clean + QR)",
)
async def upload_flashcard_image(
    request: Request,
    qr_id: str = Query(..., description="Flashcard QR ID"),
    service=Depends(get_flashcard_upload_service),
):
    """
    Accept base64-encoded PNG bytes and upload both variants to Supabase Storage.

    Request body (JSON):
        {
            "image_without_qr_b64": "base64-encoded PNG bytes",
            "image_with_qr_b64": "base64-encoded PNG bytes (optional — non-fatal if missing)"
        }

    Returns:
        {"image_url": "...", "image_with_qr_url": "..."}

    Note: Only `image_url` (clean PNG) should be saved to MongoDB.
    The `image_with_qr_url` is returned for reference/debugging.
    QR is always rendered client-side at view time.
    """
    import base64

    logger.info(f"[Admin] POST /admin/flashcards/upload-image?qr_id={qr_id}")

    body = await request.json()
    b64_clean = body.get("image_without_qr_b64", "")
    b64_qr = body.get("image_with_qr_b64", "")

    if not b64_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_without_qr_b64 is required",
        )

    try:
        image_clean = base64.b64decode(b64_clean)
        image_qr = base64.b64decode(b64_qr) if b64_qr else image_clean
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 image data",
        )

    if len(image_clean) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds 10 MB limit",
        )
    if len(image_qr) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR image exceeds 10 MB limit",
        )

    result = await service.upload_dual_images(image_clean, image_qr, qr_id)
    return result


# ========== Students ==========

@router.get("/students", response_model=PaginatedResponse)
async def get_teacher_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or ID"),
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Get all students enrolled in the teacher's courses
    
    This returns ONLY students who are enrolled in at least one of the teacher's courses.
    Teachers cannot see students who are not their students.
    """
    logger.info(f"[Admin] GET /admin/students?skip={skip}&limit={limit}&search={search}")
    
    students, total = await repo.get_students(skip=skip, limit=limit, search=search)
    
    return PaginatedResponse(
        items=students,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(students)) < total
    )


@router.get("/students/{user_id}", response_model=StudentProgressResponse)
async def get_student_detail(
    user_id: str,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Get detailed progress for a specific student
    
    Only returns progress for courses owned by this teacher.
    """
    logger.info(f"[Admin] GET /admin/students/{user_id}")
    
    student = await repo.get_student_progress(user_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found or not enrolled in your courses"
        )
    
    return StudentProgressResponse(**student)


# ========== Analytics ==========

@router.get("/analytics/progress")
async def get_progress_analytics(
    days: int = Query(30, ge=7, le=90),
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Get progress analytics for the teacher's courses
    
    Args:
        days: Number of days to look back (default 30, max 90)
    
    Returns:
        Progress trends and XP distribution
    """
    logger.info(f"[Admin] GET /admin/analytics/progress?days={days}")
    
    return await repo.get_progress_analytics(days=days)


@router.get("/analytics/engagement")
async def get_engagement_analytics(
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Get engagement metrics for the teacher's courses
    
    Returns:
        Activity by day of week
        Session statistics
    """
    logger.info(f"[Admin] GET /admin/analytics/engagement")
    
    return await repo.get_engagement_analytics()


# ========== Learning Goals ==========

@router.post("/learning-goals", response_model=LearningGoalResponse)
async def set_student_learning_goal(
    user_id: str,
    goal_data: LearningGoalCreate,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """
    Set or update learning goal for a student
    
    Args:
        user_id: The student's user ID
        goal_data: Learning goal settings
    """
    logger.info(f"[Admin] POST /admin/learning-goals for user {user_id}")
    
    # Verify student is enrolled in teacher's courses
    student = await repo.get_student_by_id(user_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found or not enrolled in your courses"
        )
    
    try:
        goal = await repo.set_learning_goal(user_id, goal_data.model_dump())
        return LearningGoalResponse(**goal)
    except Exception as e:
        logger.error(f"[Admin] Learning goal error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set learning goal"
        )


@router.get("/learning-goals/{user_id}", response_model=LearningGoalResponse)
async def get_student_learning_goal(
    user_id: str,
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Get learning goal settings for a student"""
    logger.info(f"[Admin] GET /admin/learning-goals/{user_id}")
    
    goal = await repo.get_learning_goal(user_id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning goal not found"
        )
    
    return LearningGoalResponse(**goal)


@router.get("/learning-goals", response_model=PaginatedResponse)
async def get_all_learning_goals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    repo: AdminRepository = Depends(get_admin_repo)
):
    """Get all learning goals for the teacher's students"""
    logger.info(f"[Admin] GET /admin/learning-goals?skip={skip}&limit={limit}")
    
    goals, total = await repo.get_all_learning_goals(skip=skip, limit=limit)
    
    return PaginatedResponse(
        items=goals,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(goals)) < total
    )
