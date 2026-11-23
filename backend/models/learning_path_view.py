# backend/models/learning_path_view.py
"""View models for the authenticated Learning Path 3D facade.

These describe joined courses + the selected course's lesson path, derived
from the existing courses/lessons/user_course_progress tables. Not a new
persistence model.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel

NodeState = Literal["completed", "current", "available", "locked"]


class LearningPathNode(BaseModel):
    lesson_id: str
    order: int
    title: str
    title_vi: str = ""
    state: NodeState
    xp_reward: int = 0
    position: float
    launch_path: str


class JoinedCourseSummary(BaseModel):
    course_id: str
    title: str
    title_vi: str = ""
    category_key: str = ""
    category_label: str = ""
    category_icon: str = ""
    progress: float
    completed_lessons: int
    total_lessons: int
    is_current: bool = False


class LearningPathData(BaseModel):
    current_lesson_id: Optional[str] = None
    completed_count: int
    total_count: int
    progress: float
    nodes: List[LearningPathNode]


class LearningPathMeResponse(BaseModel):
    joined_courses: List[JoinedCourseSummary]
    selected_course: Optional[JoinedCourseSummary] = None
    path: Optional[LearningPathData] = None
