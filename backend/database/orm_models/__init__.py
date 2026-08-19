"""SQLAlchemy mappings.  Import modules here so Alembic sees all metadata."""

from database.orm_models.learner import (  # noqa: F401
    CourseORM,
    LessonORM,
    LessonSessionORM,
    LessonSessionStepORM,
    LessonStepAttemptORM,
    UserCourseLessonProgressORM,
    UserCourseProgressORM,
    WordMasteryORM,
    MediaAssetORM,
)
from database.orm_models.quiz import QuizQuestionORM, QuizQuestionOptionORM  # noqa: F401
from database.orm_models.game import MiniGameItemORM  # noqa: F401
from database.orm_models.misc import (  # noqa: F401
    PetORM,
    ChatLogORM,
    LearningPathORM,
    FlashcardEditorORM,
    GamificationEventORM,
    SessionLogORM,
    PronunciationAttemptORM,
    UserSessionORM,
)
