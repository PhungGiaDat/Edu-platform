export interface LessonNode {
  lesson_id: string;
  title: string;
  status: 'completed' | 'available' | 'locked';
  type: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
  xp_reward: number;
  icon: string; // emoji or icon key
  position: number; // 0-1 along path spline
  unlock_condition?: {
    type: 'xp' | 'streak' | 'lesson';
    value: number;
    prerequisite_id?: string;
  };
}

export interface LearningPath {
  path_id: string;
  name: string;
  nodes: LessonNode[];
  total_xp: number;
}
