import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Lesson {
    id: string;
    title: string;
    description: string;
    video?: {
        title: string;
        url: string;
        duration_seconds: number;
        thumbnail_url?: string;
    };
    content?: string;
    order: number;
    is_completed: boolean;
}

export interface Course {
    title: string;
    description: string;
    level: string;
    thumbnail_url?: string;
    lessons: Lesson[];
    is_published: boolean;
}

export const CourseService = {
    async getCourses(skip = 0, limit = 20): Promise<Course[]> {
        const response = await axios.get(`${API_URL}/courses`, {
            params: { skip, limit }
        });
        return response.data;
    },

    async getCourseById(courseId: string): Promise<Course> {
        const response = await axios.get(`${API_URL}/courses/${courseId}`);
        return response.data;
    },

    async completeLesson(courseId: string, lessonId: string, userId: string): Promise<boolean> {
        const response = await axios.post(`${API_URL}/courses/${courseId}/lessons/${lessonId}/complete`, null, {
            params: { user_id: userId }
        });
        return response.data.status === 'success';
    }
};
