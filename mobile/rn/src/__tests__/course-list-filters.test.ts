/**
 * @file course-list-filters.test.ts — source-contract tests for CourseListScreen filter chips.
 *
 * Verifies the minimum RN implementation for C3:
 *   1. local category + level filter state exists
 *   2. filter options are derived from backend course fields
 *   3. the rendered list uses filteredCourses, not raw courses
 *   4. localized filter labels exist in both locales
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const COURSE_LIST_SCREEN_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/screens/CourseListScreen.tsx';
const EN_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/i18n/en.json';
const VI_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/i18n/vi.json';

const courseListScreenSrc = readFileSync(COURSE_LIST_SCREEN_PATH, 'utf-8');
const enSrc = readFileSync(EN_PATH, 'utf-8');
const viSrc = readFileSync(VI_PATH, 'utf-8');

describe('CourseListScreen C3 — course filter chips', () => {
  it('tracks selected category and level in local state', () => {
    assert.ok(
      courseListScreenSrc.includes("const [selectedCategory, setSelectedCategory] = useState<string>('all');"),
      'CourseListScreen should keep selectedCategory state',
    );
    assert.ok(
      courseListScreenSrc.includes("const [selectedLevel, setSelectedLevel] = useState<CourseLevel | 'all'>('all');"),
      'CourseListScreen should keep selectedLevel state',
    );
  });

  it('derives category options from backend category fields', () => {
    assert.ok(
      courseListScreenSrc.includes("label: course.category_label || course.category_key.replace(/_/g, ' '),"),
      'Category chip labels should come from backend category_label with a category_key fallback',
    );
    assert.ok(
      courseListScreenSrc.includes("selectedCategory === 'all' || course.category_key === selectedCategory"),
      'Category filtering should compare against course.category_key',
    );
  });

  it('filters by backend level field and renders filteredCourses', () => {
    assert.ok(
      courseListScreenSrc.includes("selectedLevel === 'all' || course.level === selectedLevel"),
      'Level filtering should compare against course.level',
    );
    assert.ok(
      courseListScreenSrc.includes('data={filteredCourses}'),
      'FlatList should render filteredCourses instead of the raw courses array',
    );
  });

  it('renders localized category and level filter sections', () => {
    assert.ok(
      courseListScreenSrc.includes("{t('courses.filterByCategory')}"),
      'CourseListScreen should localize the category filter label',
    );
    assert.ok(
      courseListScreenSrc.includes("{t('courses.filterByLevel')}"),
      'CourseListScreen should localize the level filter label',
    );
    assert.ok(enSrc.includes('"filterByCategory": "Category"'));
    assert.ok(enSrc.includes('"filterByLevel": "Level"'));
    assert.ok(viSrc.includes('"filterByCategory": "Danh mục"'));
    assert.ok(viSrc.includes('"filterByLevel": "Trình độ"'));
  });
});
