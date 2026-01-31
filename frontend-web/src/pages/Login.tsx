// pages/Login.tsx
/**
 * Login Page - Full-screen Split Layout (Fixed Black Gap)
 * 
 * Uses absolute inset-0 z-50 to overlay and cover any dark body background
 * - Desktop: 40/60 split (form left, mascot right)
 * - Mobile: Form only on cream background
 * - All emojis replaced with SVG icons for kid-friendly UI
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

const WaveHandIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* Hand */}
        <path d="M20 36 L20 28 Q20 24 24 24 Q28 24 28 28 L28 20 Q28 16 32 16 Q36 16 36 20 L36 18 Q36 14 40 14 Q44 14 44 18 L44 20 Q44 16 48 16 Q52 16 52 20 L52 38 Q52 50 40 54 L28 54 Q16 54 16 42 L16 38 Q16 34 20 34 Q20 34 20 36Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2" />
        {/* Fingers lines */}
        <path d="M28 28 L28 36" stroke="#F59E0B" strokeWidth="1" />
        <path d="M36 24 L36 36" stroke="#F59E0B" strokeWidth="1" />
        <path d="M44 24 L44 36" stroke="#F59E0B" strokeWidth="1" />
        {/* Motion lines */}
        <path d="M54 14 L58 10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <path d="M56 22 L62 20" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <path d="M54 30 L60 32" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const GamepadIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path d="M6 12h4" />
        <path d="M8 10v4" />
        <circle cx="17" cy="10" r="1" fill="currentColor" />
        <circle cx="15" cy="14" r="1" fill="currentColor" />
    </svg>
);

const PhoneARIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
        {/* AR cube */}
        <path d="M9 8l3-2 3 2v4l-3 2-3-2V8z" />
        <path d="M12 6v4" />
        <path d="M9 8l3 2 3-2" />
    </svg>
);

const RobotIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="12" rx="2" />
        <path d="M12 8V4" />
        <circle cx="12" cy="3" r="1" />
        <circle cx="9" cy="13" r="1.5" fill="currentColor" />
        <circle cx="15" cy="13" r="1.5" fill="currentColor" />
        <path d="M9 17h6" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
    </svg>
);

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("Login with", email, password);
        navigate('/courses');
        setIsLoading(false);
    };

    return (
        // WRAPPER: absolute inset-0 z-50 to cover body's dark background
        <div className="w-full min-h-screen flex flex-col md:flex-row absolute inset-0 z-50">

            {/* === LEFT SIDE: LOGIN FORM === */}
            <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 bg-[#FEF9E7] relative z-10">

                <div className="w-full max-w-md space-y-6 md:space-y-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center shadow-lg min-w-[48px]">
                            <BunnyIcon className="w-10 h-10" />
                        </div>
                        <span className="text-2xl font-bold text-orange-500">EduPlatform</span>
                    </div>

                    {/* Welcome Text */}
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 flex flex-wrap items-center gap-2">
                            <span>Chào mừng</span><br />
                            <span>trở lại!</span>
                            <WaveHandIcon className="w-10 h-10 md:w-12 md:h-12 inline-block" />
                        </h1>
                        <p className="text-gray-500 text-lg">
                            Đăng nhập để tiếp tục học nhé!
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5 md:space-y-6 mt-6 md:mt-8">
                        <div className="space-y-4">
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
                                    className="w-full px-5 md:px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-orange-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300 min-h-[56px]"
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
                                    className="w-full px-5 md:px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-orange-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300 min-h-[56px]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button - Duolingo style with shadow */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl shadow-[0_4px_0_rgb(194,65,12)] hover:shadow-[0_2px_0_rgb(194,65,12)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-200 disabled:opacity-50 min-h-[56px]"
                            >
                                {isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
                            </button>
                        </div>

                        {/* Register Link */}
                        <div className="text-center pt-4">
                            <p className="text-gray-500 font-medium">
                                Chưa có tài khoản?{' '}
                                <Link to="/register" className="text-blue-500 hover:text-blue-600 font-bold hover:underline transition-colors">
                                    Đăng ký ngay
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* === RIGHT SIDE: MASCOT HERO === */}
            {/* flex-1 ensures it fills remaining space */}
            <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#4facfe] to-[#00f2fe] relative overflow-hidden items-center justify-center">

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
                            <BunnyIcon className="w-32 h-32 md:w-40 md:h-40" />
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-md">
                        Học cùng Thỏ Trắng!
                    </h2>
                    <p className="text-white text-xl md:text-2xl font-medium opacity-90 max-w-lg mx-auto">
                        Khám phá thế giới tiếng Anh qua AR Flashcards và trò chơi vui nhộn
                    </p>

                    {/* Feature Badges */}
                    <div className="flex gap-4 justify-center mt-8 flex-wrap">
                        <span className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full text-white font-bold border border-white/30 flex items-center gap-2 min-h-[48px]">
                            <GamepadIcon className="w-5 h-5" />
                            Vui nhộn
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full text-white font-bold border border-white/30 flex items-center gap-2 min-h-[48px]">
                            <PhoneARIcon className="w-5 h-5" />
                            AR 3D
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full text-white font-bold border border-white/30 flex items-center gap-2 min-h-[48px]">
                            <RobotIcon className="w-5 h-5" />
                            AI Chat
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
