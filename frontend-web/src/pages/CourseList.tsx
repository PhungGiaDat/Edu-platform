import React, { useEffect, useState } from 'react';
import { Course, CourseService } from '../services/CourseService';
import { CourseCard } from '../components/CourseCard';
import { useNavigate } from 'react-router-dom';

export const CourseList: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadCourses = async () => {
            try {
                // Mock data for now if API fails or is empty
                const data = await CourseService.getCourses();
                if (data.length === 0) {
                    setCourses([
                        {
                            title: "English Basics 1",
                            description: "Learn the alphabet and basic greetings.",
                            level: "beginner",
                            lessons: Array(5).fill({}),
                            is_published: true
                        },
                        {
                            title: "Animals & Colors",
                            description: "Explore the world of animals and colors.",
                            level: "beginner",
                            lessons: Array(8).fill({}),
                            is_published: true
                        }
                    ]);
                } else {
                    setCourses(data);
                }
            } catch (error) {
                console.error("Failed to load courses", error);
            }
        };
        loadCourses();
    }, []);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-4xl font-black text-neutral-800 mb-8 text-center">
                Pick a Course
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, index) => (
                    <CourseCard
                        key={index}
                        course={course}
                        onClick={() => navigate(`/courses/${index}`)} // Using index as ID for mock
                    />
                ))}
            </div>
        </div>
    );
};
