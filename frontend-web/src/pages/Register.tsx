// pages/Register.tsx
/**
 * Register Page - Full-screen Split Layout (Matching Login)
 * 
 * Uses absolute inset-0 z-50 to overlay and cover any dark body background
 * - Desktop: 40/60 split (form left, mascot right)
 * - Mobile: Form only on mint background
 * - All emojis replaced with SVG icons for kid-friendly UI
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// SVG Icons
const BunnyIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* Body/Head */}
        <ellipse cx="32" cy="38" rx="18" ry="16" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
        {/* Left Ear */}
        <ellipse cx="22" cy="14" rx="6" ry="14" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
        <ellipse cx="22" cy="14" rx="3" ry="10" fill="#FECACA" />
        {/* Right Ear */}
        <ellipse cx="42" cy="14" rx="6" ry="14" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
        <ellipse cx="42" cy="14" rx="3" ry="10" fill="#FECACA" />
        {/* Eyes */}
        <circle cx="26" cy="36" r="4" fill="#1F2937" />
        <circle cx="38" cy="36" r="4" fill="#1F2937" />
        <circle cx="27" cy="35" r="1.5" fill="white" />
        <circle cx="39" cy="35" r="1.5" fill="white" />
        {/* Nose */}
        <ellipse cx="32" cy="42" rx="3" ry="2" fill="#FDA4AF" />
        {/* Mouth */}
        <path d="M28 46 Q32 50 36 46" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Cheeks */}
        <circle cx="20" cy="40" r="3" fill="#FECACA" opacity="0.6" />
        <circle cx="44" cy="40" r="3" fill="#FECACA" opacity="0.6" />
    </svg>
);

const RocketIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* Rocket body */}
        <path d="M32 8 L40 28 L40 44 L32 52 L24 44 L24 28 Z" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2" />
        {/* Window */}
        <circle cx="32" cy="28" r="6" fill="#38BDF8" stroke="#0EA5E9" strokeWidth="2" />
        <circle cx="30" cy="26" r="2" fill="white" opacity="0.6" />
        {/* Fins */}
        <path d="M24 36 L16 44 L20 48 L24 44" fill="#F472B6" stroke="#EC4899" strokeWidth="2" />
        <path d="M40 36 L48 44 L44 48 L40 44" fill="#F472B6" stroke="#EC4899" strokeWidth="2" />
        {/* Flames */}
        <ellipse cx="32" cy="56" rx="4" ry="6" fill="#FCD34D" />
        <ellipse cx="32" cy="58" rx="2" ry="4" fill="#FB923C" />
        {/* Stars */}
        <circle cx="12" cy="16" r="2" fill="#FCD34D" />
        <circle cx="52" cy="20" r="2" fill="#FCD34D" />
        <circle cx="8" cy="40" r="1.5" fill="#FCD34D" />
        <circle cx="56" cy="36" r="1.5" fill="#FCD34D" />
    </svg>
);

const StarIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
    </svg>
);

const BookIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
    </svg>
);

const MagicWandIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 4V2" />
        <path d="M15 16v-2" />
        <path d="M8 9h2" />
        <path d="M20 9h2" />
        <path d="M17.8 11.8L19 13" />
        <path d="M15 9h.01" />
        <path d="M17.8 6.2L19 5" />
        <path d="M11 6.2L9.8 5" />
        <path d="M3 21l9-9" />
        <path d="M12.2 6.2L11 5" />
    </svg>
);

export const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const navigate = useNavigate();
    const { register, isLoading } = useAuth();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        const result = await register(email, password, name);
        if (result.success) {
            navigate('/courses');
        } else {
            setLocalError(result.error || 'Registration failed');
        }
    };

    return (
        // WRAPPER: absolute inset-0 z-50 to cover body's dark background
        <div className="w-full min-h-screen flex flex-col md:flex-row absolute inset-0 z-50">

            {/* === LEFT SIDE: REGISTER FORM === */}
            <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 bg-[#ECFDF5] relative z-10">

                <div className="w-full max-w-md space-y-6 md:space-y-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg min-w-[48px]">
                            <BunnyIcon className="w-10 h-10" />
                        </div>
                        <span className="text-2xl font-bold text-emerald-600">EduPlatform</span>
                    </div>

                    {/* Welcome Text */}
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 flex flex-wrap items-center gap-2">
                            <span>Bắt đầu</span><br />
                            <span>hành trình!</span>
                            <RocketIcon className="w-10 h-10 md:w-12 md:h-12 inline-block" />
                        </h1>
                        <p className="text-gray-500 text-lg">
                            Tạo tài khoản miễn phí ngay hôm nay!
                        </p>
                    </div>

                    {/* Register Form */}
                    <form onSubmit={handleRegister} className="space-y-5 md:space-y-6 mt-6 md:mt-8">
                        {/* Error Message */}
                        {localError && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                                <p className="text-red-700 font-medium">{localError}</p>
                            </div>
                        )}

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600 tracking-wide uppercase ml-1">
                                Tên của bạn
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên"
                                className="w-full px-5 md:px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-emerald-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300 min-h-[56px]"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600 tracking-wide uppercase ml-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="hello@example.com"
                                className="w-full px-5 md:px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-emerald-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300 min-h-[56px]"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600 tracking-wide uppercase ml-1">
                                Mật khẩu
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-5 md:px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-emerald-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300 min-h-[56px]"
                                required
                            />
                        </div>

                        {/* Submit Button - Duolingo style with shadow */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl shadow-[0_4px_0_rgb(4,120,87)] hover:shadow-[0_2px_0_rgb(4,120,87)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-200 disabled:opacity-50 min-h-[56px]"
                            >
                                {isLoading ? 'ĐANG TẠO TÀI KHOẢN...' : 'TẠO TÀI KHOẢN'}
                            </button>
                        </div>

                        {/* Login Link */}
                        <div className="text-center pt-4">
                            <p className="text-gray-500 font-medium">
                                Đã có tài khoản?{' '}
                                <Link to="/login" className="text-blue-500 hover:text-blue-600 font-bold hover:underline transition-colors">
                                    Đăng nhập
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* === RIGHT SIDE: MASCOT HERO === */}
            <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#34D399] to-[#10B981] relative overflow-hidden items-center justify-center">

                {/* Decorative Circles */}
                <div className="absolute top-10 right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>

                {/* Mascot Content */}
                <div className="text-center z-10 p-10">
                    {/* Mascot Glow Effect */}
                    <div className="relative inline-block mb-8">
                        <div className="absolute inset-0 bg-white opacity-30 blur-3xl rounded-full transform scale-150"></div>
                        <div className="relative animate-bounce-slow drop-shadow-2xl">
                            <RocketIcon className="w-32 h-32 md:w-40 md:h-40" />
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-md">
                        Khám phá thế giới mới!
                    </h2>
                    <p className="text-white text-xl md:text-2xl font-medium opacity-90 max-w-lg mx-auto">
                        Học tiếng Anh cùng AR 3D, trò chơi và AI thông minh
                    </p>

                    {/* Feature Badges */}
                    <div className="flex gap-4 justify-center mt-8 flex-wrap">
                        <span className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full text-white font-bold border border-white/30 flex items-center gap-2 min-h-[48px]">
                            <StarIcon className="w-5 h-5" />
                            100+ Bài học
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full text-white font-bold border border-white/30 flex items-center gap-2 min-h-[48px]">
                            <BookIcon className="w-5 h-5" />
                            Flashcards
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full text-white font-bold border border-white/30 flex items-center gap-2 min-h-[48px]">
                            <MagicWandIcon className="w-5 h-5" />
                            AR Magic
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
