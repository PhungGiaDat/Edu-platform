import { create } from 'zustand';
import type { JoinedCourseSummary, LearningPathData } from '@/types/learning-path';

interface LearningPath3DState {
  joinedCourses: JoinedCourseSummary[];
  selectedCourseId: string | null;
  path: LearningPathData | null;
  selectedNodeId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  setJoinedCourses: (courses: JoinedCourseSummary[]) => void;
  setSelectedCourse: (courseId: string | null) => void;
  setPath: (path: LearningPathData | null) => void;
  selectNode: (nodeId: string) => void;
  clearSelectedNode: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  joinedCourses: [] as JoinedCourseSummary[],
  selectedCourseId: null as string | null,
  path: null as LearningPathData | null,
  selectedNodeId: null as string | null,
  loading: true,
  error: null as string | null,
};

export const useLearningPath3DStore = create<LearningPath3DState>((set) => ({
  ...initialState,

  setJoinedCourses: (joinedCourses) => set({ joinedCourses }),

  setSelectedCourse: (selectedCourseId) => set({ selectedCourseId }),

  setPath: (path) => set({ path }),

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  clearSelectedNode: () => set({ selectedNodeId: null }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState }),
}));
