"""Versioned authored Lesson Activity contract stored in lessons.learning_blocks."""

from __future__ import annotations

from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


ActivityId = Annotated[str, Field(min_length=1, pattern=r"^[a-z0-9][a-z0-9._:-]*$")]
ReferenceId = Annotated[str, Field(min_length=1)]
PositiveReferenceId = Annotated[int, Field(gt=0)]
ActivityType = Literal[
    "warm_up",
    "learn_vocabulary",
    "listen_choose",
    "match",
    "drag_drop",
    "memory_match",
    "coloring",
    "mini_game",
    "quiz",
    "read_aloud",
    "pronunciation",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CompletionPolicy(StrictModel):
    mode: Literal[
        "viewed",
        "all_items",
        "interaction_complete",
        "game_complete",
        "quiz_complete",
    ]


class WarmUpConfig(StrictModel):
    media_asset_ids: List[ReferenceId] = Field(min_length=1)


class LearnVocabularyConfig(StrictModel):
    vocabulary_ids: List[ReferenceId] = Field(min_length=1)


class ListenChooseConfig(StrictModel):
    vocabulary_ids: List[ReferenceId] = Field(min_length=1)
    question_count: Optional[int] = Field(default=None, gt=0)
    order_policy: Literal["authored", "random"] = "authored"

    @model_validator(mode="after")
    def validate_question_count(self) -> "ListenChooseConfig":
        if self.question_count is not None and self.question_count > len(self.vocabulary_ids):
            raise ValueError("question_count cannot exceed the vocabulary reference count")
        return self


class PracticeReferenceConfig(StrictModel):
    vocabulary_ids: List[ReferenceId] = Field(default_factory=list)
    mini_game_item_ids: List[PositiveReferenceId] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_reference_source(self) -> "PracticeReferenceConfig":
        if not self.vocabulary_ids and not self.mini_game_item_ids:
            raise ValueError("at least one vocabulary or mini-game item reference is required")
        return self


class ColoringConfig(StrictModel):
    vocabulary_id: ReferenceId
    outline_asset_id: ReferenceId


class MiniGameConfig(StrictModel):
    game_type: Literal[
        "catch_word",
        "drag_match",
        "memory_match",
        "word_scramble",
        "coloring",
    ]
    mini_game_item_ids: List[PositiveReferenceId] = Field(min_length=1)


class QuizConfig(StrictModel):
    question_ids: List[PositiveReferenceId] = Field(min_length=1)
    question_count: Optional[int] = Field(default=None, gt=0)
    order_policy: Literal["authored", "random"] = "authored"

    @model_validator(mode="after")
    def validate_question_count(self) -> "QuizConfig":
        if len(self.question_ids) != len(set(self.question_ids)):
            raise ValueError("question_ids must not contain duplicates")
        if self.question_count is not None and self.question_count > len(self.question_ids):
            raise ValueError("question_count cannot exceed the question reference count")
        return self


class ReadAloudConfig(StrictModel):
    story_id: ReferenceId


class PronunciationConfig(StrictModel):
    vocabulary_ids: List[ReferenceId] = Field(min_length=1)


class LessonActivityBase(StrictModel):
    activity_id: ActivityId
    order: int = Field(ge=1)
    required: bool
    completion_policy: CompletionPolicy
    title: Optional[str] = Field(default=None, min_length=1)
    instructions: Optional[str] = Field(default=None, min_length=1)


class WarmUpActivity(LessonActivityBase):
    type: Literal["warm_up"]
    config: WarmUpConfig


class LearnVocabularyActivity(LessonActivityBase):
    type: Literal["learn_vocabulary"]
    config: LearnVocabularyConfig


class ListenChooseActivity(LessonActivityBase):
    type: Literal["listen_choose"]
    config: ListenChooseConfig


class MatchActivity(LessonActivityBase):
    type: Literal["match"]
    config: PracticeReferenceConfig


class DragDropActivity(LessonActivityBase):
    type: Literal["drag_drop"]
    config: PracticeReferenceConfig


class MemoryMatchActivity(LessonActivityBase):
    type: Literal["memory_match"]
    config: PracticeReferenceConfig


class ColoringActivity(LessonActivityBase):
    type: Literal["coloring"]
    config: ColoringConfig


class MiniGameActivity(LessonActivityBase):
    type: Literal["mini_game"]
    config: MiniGameConfig


class QuizActivity(LessonActivityBase):
    type: Literal["quiz"]
    config: QuizConfig


class ReadAloudActivity(LessonActivityBase):
    type: Literal["read_aloud"]
    config: ReadAloudConfig


class PronunciationActivity(LessonActivityBase):
    type: Literal["pronunciation"]
    config: PronunciationConfig


LessonActivity = Annotated[
    Union[
        WarmUpActivity,
        LearnVocabularyActivity,
        ListenChooseActivity,
        MatchActivity,
        DragDropActivity,
        MemoryMatchActivity,
        ColoringActivity,
        MiniGameActivity,
        QuizActivity,
        ReadAloudActivity,
        PronunciationActivity,
    ],
    Field(discriminator="type"),
]


_COMPLETION_MODES = {
    "warm_up": {"viewed"},
    "learn_vocabulary": {"viewed", "all_items"},
    "listen_choose": {"all_items", "interaction_complete"},
    "match": {"all_items", "interaction_complete"},
    "drag_drop": {"all_items", "interaction_complete"},
    "memory_match": {"all_items", "interaction_complete"},
    "coloring": {"interaction_complete"},
    "mini_game": {"game_complete"},
    "quiz": {"quiz_complete"},
    "read_aloud": {"all_items"},
    "pronunciation": {"all_items", "interaction_complete"},
}


class LessonLearningBlocks(StrictModel):
    schema_version: Literal[1, 2] = 2
    content_version: int = Field(default=1, ge=1)
    vocabulary: List[Union[ReferenceId, Dict[str, Any]]] = Field(default_factory=list)
    activities: List[LessonActivity] = Field(default_factory=list)

    # Known schema-v1 fields are retained during the additive transition.
    activity: Optional[Dict[str, Any]] = None
    game: Optional[Dict[str, Any]] = None
    pronunciation: Optional[Dict[str, Any]] = None
    quiz: Optional[List[Dict[str, Any]]] = None
    readAloudStory: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_envelope(self) -> "LessonLearningBlocks":
        if self.schema_version == 1 and self.activities:
            raise ValueError("schema_version 1 cannot contain canonical activities")
        if self.schema_version == 2 and not self.activities:
            raise ValueError("schema_version 2 requires at least one activity")
        if self.schema_version == 2 and any(not isinstance(item, str) for item in self.vocabulary):
            raise ValueError("schema_version 2 vocabulary must contain canonical reference IDs")

        activity_ids = [activity.activity_id for activity in self.activities]
        if len(activity_ids) != len(set(activity_ids)):
            raise ValueError("activity_id must be unique within the lesson")

        orders = [activity.order for activity in self.activities]
        if len(orders) != len(set(orders)):
            raise ValueError("activity order must be unique within the lesson")

        for activity in self.activities:
            if activity.completion_policy.mode not in _COMPLETION_MODES[activity.type]:
                raise ValueError(
                    f"completion mode {activity.completion_policy.mode!r} is invalid for {activity.type!r}"
                )

        self.activities.sort(key=lambda activity: activity.order)
        return self


def normalize_learning_blocks(value: Any) -> LessonLearningBlocks:
    """Validate v2 content or wrap known flat legacy content as schema v1."""
    blocks = dict(value) if isinstance(value, dict) else {}
    is_versioned = any(key in blocks for key in ("schema_version", "content_version", "activities"))
    if not is_versioned:
        blocks = {
            "schema_version": 1,
            "content_version": 1,
            "activities": [],
            **blocks,
        }
    elif "schema_version" not in blocks:
        blocks["schema_version"] = 2
    return LessonLearningBlocks.model_validate(blocks)
