import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/apiClient', () => ({ apiClient: { get: vi.fn() } }));

import { apiClient } from '@/services/apiClient';
import { courseService } from '@/services/CourseService';

describe('course progress authentication boundary', () => {
  it('returns empty guest progress without requesting a protected endpoint', async () => {
    vi.mocked(apiClient.get).mockClear();
    vi.mocked(apiClient.get).mockResolvedValue([]);

    expect(await courseService.getProgress('guest-learner')).toEqual([]);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('still fetches signed-in learner progress from the API', async () => {
    const progress = [{ course_id: 'family', completed_lessons: ['hello-family'] }];
    vi.mocked(apiClient.get).mockClear();
    vi.mocked(apiClient.get).mockResolvedValue(progress);

    expect(await courseService.getProgress('learner-1')).toEqual(progress);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users/learner-1/progress');
  });
});
