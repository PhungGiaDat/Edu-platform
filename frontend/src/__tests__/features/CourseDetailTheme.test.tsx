import { describe, it, expect } from 'vitest';
import { getCourseTheme } from '@/features/courses/courseThemes';
import type { Course } from '@/types/course';

describe('Course Theme System for CourseDetail', () => {
  const homeCourse: Course = {
    course_id: 'momo-home-family-english-5-7',
    title: 'Momo Learns English at Home',
    theme: 'Home, Family and Feelings',
    category_key: 'home_family',
    category_label: 'Gia đình',
    category_icon: 'HF',
    age_range: '5-8',
    level: 'beginner',
    subtitle_vi: 'Gia đình, ngôi nhà và cảm xúc',
    description_vi: 'Khóa học về gia đình',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: [],
    is_published: true,
  };

  const natureCourse: Course = {
    course_id: 'momo-nature-english-5-7',
    title: 'Momo Explores Animals and Nature',
    theme: 'Animals and Nature',
    category_key: 'nature',
    category_label: 'Thiên nhiên',
    category_icon: 'AN',
    age_range: '5-8',
    level: 'beginner',
    subtitle_vi: 'Động vật và thiên nhiên',
    description_vi: 'Khóa học về thiên nhiên',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: [],
    is_published: true,
  };

  const schoolCourse: Course = {
    course_id: 'momo-school-food-english-5-7',
    title: 'Momo Learns English at School',
    theme: 'School and Food',
    category_key: 'school_food',
    category_label: 'Trường học',
    category_icon: 'SF',
    age_range: '5-8',
    level: 'beginner',
    subtitle_vi: 'Trường học và món ăn',
    description_vi: 'Khóa học về trường học',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: [],
    is_published: true,
  };

  it('correctly maps Home & Family course to home theme', () => {
    const theme = getCourseTheme(homeCourse);
    expect(theme.key).toBe('home');
    expect(theme.heroLessonId).toBe('hello-family');
    expect(theme.mascotName).toBe('Cozy Momo');
    expect(theme.badgeLabelVi).toContain('Gia đình');
    expect(theme.objectives.length).toBe(4);
  });

  it('correctly maps Animals & Nature course to nature theme', () => {
    const theme = getCourseTheme(natureCourse);
    expect(theme.key).toBe('nature');
    expect(theme.heroLessonId).toBe('meet-the-elephant');
    expect(theme.mascotName).toBe('Explorer Momo');
    expect(theme.badgeLabelVi).toContain('Rừng xanh');
    expect(theme.objectives.length).toBe(4);
  });

  it('correctly maps School & Food course to school theme', () => {
    const theme = getCourseTheme(schoolCourse);
    expect(theme.key).toBe('school');
    expect(theme.heroLessonId).toBe('my-classroom');
    expect(theme.mascotName).toBe('Scholar Momo');
    expect(theme.badgeLabelVi).toContain('Lớp học');
    expect(theme.objectives.length).toBe(4);
  });

  it('falls back cleanly to home theme when course is undefined or unmapped', () => {
    const theme = getCourseTheme(null);
    expect(theme.key).toBe('home');
    expect(theme.heroLessonId).toBe('hello-family');
  });
});
