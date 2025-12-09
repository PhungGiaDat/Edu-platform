// pages/Login.tsx
/**
 * Login Page - Full-screen Split Layout (Fixed Black Gap)
 * 
 * Uses absolute inset-0 z-50 to overlay and cover any dark body background
 * - Desktop: 40/60 split (form left, mascot right)
 * - Mobile: Form only on cream background
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
            <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 bg-[#FEF9E7] relative z-10">

                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            🐰
                        </div>
                        <span className="text-2xl font-bold text-orange-500">EduPlatform</span>
                    </div>

                    {/* Welcome Text */}
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
                            Chào mừng <br />trở lại! 👋
                        </h1>
                        <p className="text-gray-500 text-lg">
                            Đăng nhập để tiếp tục học nhé!
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6 mt-8">
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
                                    className="w-full px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-orange-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300"
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
                                    className="w-full px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 focus:border-orange-400 focus:outline-none transition-all shadow-sm text-lg placeholder:text-gray-300"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button - Duolingo style with shadow */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl shadow-[0_4px_0_rgb(194,65,12)] hover:shadow-[0_2px_0_rgb(194,65,12)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-200 disabled:opacity-50"
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
                        <div className="relative text-[120px] md:text-[160px] animate-bounce-slow drop-shadow-2xl">
                            🐰
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
                        <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold border border-white/30">
                            🎮 Vui nhộn
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold border border-white/30">
                            📱 AR 3D
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold border border-white/30">
                            🤖 AI Chat
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
