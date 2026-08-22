import { create } from 'zustand';
import { LessonNode } from '@/types/learning-path';

interface LearningPath3DState {
  nodes: LessonNode[];
  currentProgress: number; // 0-1 position on path
  selectedNode: LessonNode | null;
  isModalOpen: boolean;

  // Actions
  setNodes: (nodes: LessonNode[]) => void;
  setCurrentProgress: (progress: number) => void;
  setSelectedNode: (node: LessonNode | null) => void;
  openModal: (node: LessonNode) => void;
  closeModal: () => void;
  completeLesson: (lessonId: string) => void;
}

export const useLearningPath3DStore = create<LearningPath3DState>((set) => ({
  nodes: [],
  currentProgress: 0,
  selectedNode: null,
  isModalOpen: false,

  setNodes: (nodes) => set({ nodes }),

  setCurrentProgress: (progress) => set({ currentProgress: progress }),

  setSelectedNode: (node) => set({ selectedNode: node }),

  openModal: (node) => set({ selectedNode: node, isModalOpen: true }),

  closeModal: () => set({ selectedNode: null, isModalOpen: false }),

  completeLesson: (lessonId) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.lesson_id === lessonId ? { ...node, status: 'completed' as const } : node
      ),
    })),
}));
