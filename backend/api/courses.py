from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any
from services.course_service import CourseService, get_course_service
from models.course_model import CourseSchema
from database.supabase_client import get_supabase

router = APIRouter()

@router.get("/courses", response_model=List[CourseSchema])
async def get_courses(
    skip: int = 0, 
    limit: int = 20,
    service: CourseService = Depends(get_course_service)
):
    return await service.get_courses(skip, limit)

@router.get("/courses/{course_id}", response_model=CourseSchema)
async def get_course(
    course_id: str,
    service: CourseService = Depends(get_course_service)
):
    course = await service.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.post("/courses/{course_id}/lessons/{lesson_id}/complete")
async def complete_lesson(
    course_id: str,
    lesson_id: str,
    user_id: str, # In real app, get from auth token
    service: CourseService = Depends(get_course_service)
):
    success = await service.complete_lesson(user_id, course_id, lesson_id)
    return {"status": "success", "completed": success}
