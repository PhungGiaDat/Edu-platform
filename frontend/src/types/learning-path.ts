export type LessonNodeState = 'completed' | 'current' | 'available' | 'locked';

export interface LessonNode {
  lesson_id: string;
  order: number;
  title: string;
  title_vi?: string;
  state: LessonNodeState;
  xp_reward: number;
  position: number; // 0-1 along path spline
  launch_path: string;
}

export interface JoinedCourseSummary {
  course_id: string;
  title: string;
  title_vi?: string;
  category_key: string;
  category_label: string;
  category_icon: string;
  progress: number; // 0-1
  completed_lessons: number;
  total_lessons: number;
  is_current: boolean;
}

export interface LearningPathData {
  current_lesson_id: string | null;
  completed_count: number;
  total_count: number;
  progress: number; // 0-1
  nodes: LessonNode[];
}

export interface LearningPathMeResponse {
  joined_courses: JoinedCourseSummary[];
  selected_course: JoinedCourseSummary | null;
  path: LearningPathData | null;
}
