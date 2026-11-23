import type { LessonActivity } from '../types/course';

export const orderLessonActivities = (activities: LessonActivity[]): LessonActivity[] =>
  [...activities].sort((left, right) => left.order - right.order);

export const activityAtCompletedCount = (
  activities: LessonActivity[],
  completedCount: number,
): LessonActivity | undefined => {
  if (activities.length === 0) return undefined;
  return activities[Math.min(completedCount, activities.length - 1)];
};
