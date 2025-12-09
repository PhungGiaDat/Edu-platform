// pages/CourseList.tsx
/**
 * Course List Page - Now uses CourseMap for learning path view
 * Combines course selection with Duolingo-style learning map
 */
import React from 'react';
import { CourseMap } from '../components/CourseMap';

export const CourseList: React.FC = () => {
    return <CourseMap />;
};

