/**
 * CourseList.tsx — Playful Course Catalog
 *
 * Redesigned with vibrant claymorphism design:
 * - Course catalog preview with clay cards
 * - Progress tracking visualization
 * - Learning path preview
 * - Enrollment CTA
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Course {
    id: string;
    title: string;
    titleVi: string;
    description: string;
    icon: string;
    color: string;
    colorDark: string;
    lessonsCount: number;
    completedLessons: number;
    xpReward: number;
    level: 'beginner' | 'intermediate' | 'advanced';
    duration: string;
    tags: string[];
}

interface LearningPath {
    id: string;
    title: string;
    icon: string;
    courses: string[];
    progress: number;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────
const mockCourses: Course[] = [
    {
        id: 'animals',
        title: 'Animal World',
        titleVi: 'Thế giới động vật',
        description: 'Learn about farm animals, jungle creatures, and ocean life through AR experiences!',
        icon: '🦁',
        color: '#FFB4A2',
        colorDark: '#E88A78',
        lessonsCount: 12,
        completedLessons: 5,
        xpReward: 500,
        level: 'beginner',
        duration: '2 hours',
        tags: ['AR', 'Vocabulary', 'Fun'],
    },
    {
        id: 'colors-shapes',
        title: 'Colors & Shapes',
        titleVi: 'Màu sắc & Hình khối',
        description: 'Discover the rainbow and learn geometric shapes with interactive flashcards!',
        icon: '🌈',
        color: '#A8D8FF',
        colorDark: '#68A8E0',
        lessonsCount: 8,
        completedLessons: 8,
        xpReward: 350,
        level: 'beginner',
        duration: '1.5 hours',
        tags: ['Flashcards', 'Visual'],
    },
    {
        id: 'family-friends',
        title: 'Family & Friends',
        titleVi: 'Gia đình & Bạn bè',
        description: 'Learn vocabulary about family members and making friends in English!',
        icon: '👨‍👩‍👧',
        color: '#D4A5FF',
        colorDark: '#A470D8',
        lessonsCount: 10,
        completedLessons: 2,
        xpReward: 400,
        level: 'beginner',
        duration: '1.8 hours',
        tags: ['Social', 'Speaking'],
    },
    {
        id: 'food-drinks',
        title: 'Food & Drinks',
        titleVi: 'Đồ ăn & Thức uống',
        description: 'Explore delicious vocabulary with tasty foods and refreshing drinks!',
        icon: '🍕',
        color: '#A8E6CF',
        colorDark: '#6BC494',
        lessonsCount: 15,
        completedLessons: 0,
        xpReward: 600,
        level: 'intermediate',
        duration: '2.5 hours',
        tags: ['Vocabulary', 'Daily Life'],
    },
    {
        id: 'numbers',
        title: 'Numbers & Counting',
        titleVi: 'Số & Đếm',
        description: 'Master numbers from 1 to 100 with fun counting games and quizzes!',
        icon: '🔢',
        color: '#FFE066',
        colorDark: '#E5B800',
        lessonsCount: 10,
        completedLessons: 0,
        xpReward: 450,
        level: 'beginner',
        duration: '1.5 hours',
        tags: ['Math', 'Quiz'],
    },
    {
        id: 'nature',
        title: 'Nature & Weather',
        titleVi: 'Thiên nhiên & Thời tiết',
        description: 'Discover plants, seasons, and weather vocabulary with AR outdoor scenes!',
        icon: '🌳',
        color: '#B4E197',
        colorDark: '#7DC760',
        lessonsCount: 12,
        completedLessons: 0,
        xpReward: 500,
        level: 'intermediate',
        duration: '2 hours',
        tags: ['AR', 'Science'],
    },
];

const mockLearningPaths: LearningPath[] = [
    {
        id: 'path-beginner',
        title: 'Beginner Journey',
        icon: '🚀',
        courses: ['animals', 'colors-shapes', 'numbers'],
        progress: 65,
    },
    {
        id: 'path-explorer',
        title: 'Young Explorer',
        icon: '🌟',
        courses: ['family-friends', 'food-drinks', 'nature'],
        progress: 15,
    },
];

// ─── Course Card Component ──────────────────────────────────────────────────
const CourseCard: React.FC<{ 
    course: Course; 
    onClick: () => void;
}> = ({ course, onClick }) => {
    const progress = Math.round((course.completedLessons / course.lessonsCount) * 100);
    const isCompleted = progress === 100;
    const isStarted = progress > 0;

    const levelColors = {
        beginner: { bg: '#E8FFF0', text: '#059669' },
        intermediate: { bg: '#FFF8E7', text: '#D97706' },
        advanced: { bg: '#FFE4F3', text: '#DB2777' },
    };

    return (
        <div 
            className="clay-course-card group"
            onClick={onClick}
        >
            {/* Completion Ribbon */}
            {isCompleted && (
                <div className="clay-ribbon">
                    ✓ COMPLETED
                </div>
            )}

            {/* Course Thumbnail */}
            <div 
                className="clay-course-thumb relative"
                style={{ 
                    background: `linear-gradient(135deg, ${course.color}80 0%, ${course.color}40 100%)` 
                }}
            >
                <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                    {course.icon}
                </span>
                
                {/* XP Badge */}
                <div className="absolute top-3 left-3 clay-badge-yellow">
                    ⚡ {course.xpReward} XP
                </div>
            </div>

            {/* Course Content */}
            <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                    <span 
                        className="text-xs font-bold px-2 py-1 rounded-full capitalize"
                        style={{ 
                            background: levelColors[course.level].bg,
                            color: levelColors[course.level].text,
                        }}
                    >
                        {course.level}
                    </span>
                    <span className="text-xs text-gray-500">• {course.duration}</span>
                </div>

                <h3 className="font-black text-lg text-gray-800 mb-1">{course.title}</h3>
                <p className="text-sm text-gray-500 mb-1">{course.titleVi}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {course.tags.map(tag => (
                        <span 
                            key={tag}
                            className="text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-600"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span style={{ color: course.colorDark }}>{course.completedLessons}/{course.lessonsCount}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full transition-all duration-500 clay-shimmer"
                            style={{ 
                                width: `${progress}%`,
                                background: `linear-gradient(90deg, ${course.color}, ${course.colorDark})`,
                            }}
                        />
                    </div>
                </div>

                {/* CTA Button */}
                <button 
                    className="w-full clay-btn clay-btn-md"
                    style={{ 
                        background: `linear-gradient(145deg, ${course.color}, ${course.colorDark})`,
                        boxShadow: `0 6px 0 ${course.colorDark}, 0 12px 24px ${course.color}40`,
                        color: '#1A2744',
                    }}
                >
                    {isCompleted ? 'Review Course' : isStarted ? 'Continue Learning' : 'Start Course'}
                </button>
            </div>
        </div>
    );
};

// ─── Learning Path Card ─────────────────────────────────────────────────────
const LearningPathCard: React.FC<{
    path: LearningPath;
    courses: Course[];
}> = ({ path, courses }) => {
    const pathCourses = courses.filter(c => path.courses.includes(c.id));
    
    return (
        <div className="clay-card-elevated p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="clay-icon-bubble clay-icon-bubble-sunshine">
                    {path.icon}
                </div>
                <div>
                    <h3 className="font-black text-xl text-gray-800">{path.title}</h3>
                    <p className="text-sm text-gray-500">{pathCourses.length} courses</p>
                </div>
                <div className="ml-auto text-right">
                    <div className="text-2xl font-black" style={{ color: '#5B8DEF' }}>{path.progress}%</div>
                    <div className="text-xs text-gray-500">completed</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                    className="h-full rounded-full clay-shimmer"
                    style={{ 
                        width: `${path.progress}%`,
                        background: 'linear-gradient(90deg, #5B8DEF, #FF9F9F)',
                    }}
                />
            </div>

            {/* Course Icons */}
            <div className="flex items-center gap-3">
                {pathCourses.map((course, index) => (
                    <div 
                        key={course.id}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 border-white shadow-md"
                        style={{ 
                            background: `linear-gradient(145deg, ${course.color}, ${course.colorDark})`,
                            marginLeft: index > 0 ? '-8px' : 0,
                            zIndex: pathCourses.length - index,
                        }}
                    >
                        {course.icon}
                    </div>
                ))}
                <span className="text-sm text-gray-500 ml-2">
                    {pathCourses.filter(c => c.completedLessons === c.lessonsCount).length} of {pathCourses.length} done
                </span>
            </div>
        </div>
    );
};

// ─── Stats Overview ─────────────────────────────────────────────────────────
const StatsOverview: React.FC<{ courses: Course[] }> = ({ courses }) => {
    const totalLessons = courses.reduce((acc, c) => acc + c.lessonsCount, 0);
    const completedLessons = courses.reduce((acc, c) => acc + c.completedLessons, 0);
    const totalXP = courses.reduce((acc, c) => acc + (c.completedLessons / c.lessonsCount) * c.xpReward, 0);
    const coursesStarted = courses.filter(c => c.completedLessons > 0).length;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="clay-stat-card">
                <div className="text-3xl mb-2">📚</div>
                <div className="clay-stat-number">{courses.length}</div>
                <div className="clay-stat-label">Total Courses</div>
            </div>
            <div className="clay-stat-card">
                <div className="text-3xl mb-2">✅</div>
                <div className="clay-stat-number">{completedLessons}/{totalLessons}</div>
                <div className="clay-stat-label">Lessons Done</div>
            </div>
            <div className="clay-stat-card">
                <div className="text-3xl mb-2">⚡</div>
                <div className="clay-stat-number">{Math.round(totalXP)}</div>
                <div className="clay-stat-label">XP Earned</div>
            </div>
            <div className="clay-stat-card">
                <div className="text-3xl mb-2">🚀</div>
                <div className="clay-stat-number">{coursesStarted}</div>
                <div className="clay-stat-label">In Progress</div>
            </div>
        </div>
    );
};

// ─── Main CourseList Component ──────────────────────────────────────────────
export const CourseList: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCourses = mockCourses.filter(course => {
        const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             course.titleVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesLevel && matchesSearch;
    });

    const handleCourseClick = (courseId: string) => {
        navigate(`/courses/${courseId}`);
    };

    return (
        <div className="min-h-screen clay-bg-playful">
            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="clay-shape-circle w-96 h-96 -top-48 -right-48 opacity-40" />
                <div className="clay-shape-circle w-64 h-64 top-1/3 -left-32 opacity-30" />
                <div className="clay-shape-circle w-80 h-80 bottom-20 right-1/4 opacity-25" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
                {/* Hero Section */}
                <header className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 clay-badge-yellow mb-4">
                        <span>🎓</span>
                        <span>Learn English with Fun!</span>
                    </div>
                    <h1 
                        className="text-4xl md:text-5xl font-black text-gray-800 mb-4"
                        style={{ fontFamily: "'Baloo 2', sans-serif" }}
                    >
                        Course Catalog
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Explore our interactive courses designed for young learners. 
                        Learn vocabulary through AR, flashcards, and fun quizzes!
                    </p>
                </header>

                {/* Stats Overview */}
                <StatsOverview courses={mockCourses} />

                {/* Learning Paths Section */}
                <section className="mb-12">
                    <h2 className="clay-section-title mb-6">Your Learning Paths</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {mockLearningPaths.map(path => (
                            <LearningPathCard 
                                key={path.id} 
                                path={path} 
                                courses={mockCourses}
                            />
                        ))}
                    </div>
                </section>

                {/* Filters */}
                <section className="mb-8">
                    <div className="clay-card-elevated p-4 flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 w-full">
                            <input
                                type="text"
                                placeholder="🔍 Search courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="clay-input"
                            />
                        </div>

                        {/* Level Filter */}
                        <div className="flex gap-2">
                            {['all', 'beginner', 'intermediate', 'advanced'].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`clay-tab ${selectedLevel === level ? 'clay-tab-active' : ''}`}
                                >
                                    {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Course Grid */}
                <section className="mb-12">
                    <h2 className="clay-section-title mb-6">All Courses</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map(course => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                onClick={() => handleCourseClick(course.id)}
                            />
                        ))}
                    </div>

                    {filteredCourses.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="font-bold text-xl text-gray-800 mb-2">No courses found</h3>
                            <p className="text-gray-600">Try a different search or filter</p>
                        </div>
                    )}
                </section>

                {/* CTA Section */}
                <section className="clay-hero rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                    {/* Floating Elements */}
                    <div className="absolute top-4 left-8 text-5xl clay-float-element opacity-60">📚</div>
                    <div className="absolute bottom-8 right-12 text-4xl clay-float-element opacity-60" style={{ animationDelay: '-2s' }}>🌟</div>
                    <div className="absolute top-1/2 right-8 text-3xl clay-float-element opacity-50" style={{ animationDelay: '-4s' }}>🚀</div>

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
                            Ready to Start Learning?
                        </h2>
                        <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
                            Join thousands of young learners who are mastering English through 
                            interactive AR experiences and fun games!
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            {isAuthenticated ? (
                                <>
                                    <button 
                                        className="clay-cta-primary"
                                        onClick={() => navigate('/learn-ar')}
                                    >
                                        🎯 Try AR Learning
                                    </button>
                                    <button 
                                        className="clay-cta-secondary"
                                        onClick={() => navigate('/flashcards')}
                                    >
                                        📚 Study Flashcards
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        className="clay-cta-primary"
                                        onClick={() => navigate('/register')}
                                    >
                                        🚀 Get Started Free
                                    </button>
                                    <button 
                                        className="clay-cta-secondary"
                                        onClick={() => navigate('/login')}
                                    >
                                        Sign In
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Social Proof */}
                        <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4">
                            <div className="clay-avatar-group">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <img 
                                        key={i}
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=student${i}`}
                                        alt={`Student ${i}`}
                                        className="clay-avatar"
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-gray-600">
                                <strong className="text-gray-800">2,500+</strong> students already learning!
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default CourseList;
