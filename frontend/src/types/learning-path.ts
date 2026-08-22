export interface LessonNode {
  lesson_id: string;
  title: string;
  status: 'completed' | 'available' | 'locked';
  type: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
  xp_reward: number;
  icon: string;
  position: number; // 0-1 along path spline
  unlock_condition?: {
    type: 'xp' | 'streak' | 'lesson';
    value: number;
    prerequisite_id?: string;
  };
}

export interface Unit {
  unit_id: string;
  title: string;
  lessons: LessonNode[];
}
