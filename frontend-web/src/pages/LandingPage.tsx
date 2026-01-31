import React from 'react';
import { Link } from 'react-router-dom';

// SVG Icons as components for better reusability
const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10l-10-5L2 10l10 5 10-5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
        <path d="M22 10v6" />
    </svg>
);

const SparkleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
        <path d="M5 5l1.5 4.5L2 12l4.5-2.5L5 5z" opacity="0.5" />
        <path d="M19 5l-1.5 4.5L22 12l-4.5-2.5L19 5z" opacity="0.5" />
    </svg>
);

const LionIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* Mane */}
        <circle cx="32" cy="32" r="24" fill="#F59E0B" />
        {/* Face */}
        <circle cx="32" cy="34" r="16" fill="#FCD34D" />
        {/* Eyes */}
        <circle cx="26" cy="32" r="3" fill="#1F2937" />
        <circle cx="38" cy="32" r="3" fill="#1F2937" />
        <circle cx="27" cy="31" r="1" fill="white" />
        <circle cx="39" cy="31" r="1" fill="white" />
        {/* Nose */}
        <ellipse cx="32" cy="38" rx="4" ry="3" fill="#92400E" />
        {/* Mouth */}
        <path d="M28 42 Q32 46 36 42" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Ears */}
        <circle cx="14" cy="20" r="6" fill="#F59E0B" />
        <circle cx="50" cy="20" r="6" fill="#F59E0B" />
        <circle cx="14" cy="20" r="3" fill="#FBBF24" />
        <circle cx="50" cy="20" r="3" fill="#FBBF24" />
    </svg>
);

const HeartIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-light/30 to-secondary-light/30 flex flex-col">
            {/* Navbar */}
            <nav className="p-4 md:p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                        <GraduationCapIcon className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
                </div>
                <div className="flex gap-2 md:gap-4">
                    <Link 
                        to="/login" 
                        className="px-4 md:px-6 py-3 font-bold text-neutral-600 hover:text-primary transition-colors min-h-[48px] flex items-center"
                    >
                        Log in
                    </Link>
                    <Link 
                        to="/register" 
                        className="px-4 md:px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 min-h-[48px] flex items-center"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-4 md:px-6 max-w-7xl mx-auto gap-8 md:gap-12 py-8">
                <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6">
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-neutral-800 leading-tight">
                        Learn Languages <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary inline-flex items-center gap-2">
                            with Magic! 
                            <SparkleIcon className="w-8 h-8 md:w-12 md:h-12 text-yellow-400 inline-block" />
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-500 font-medium max-w-lg mx-auto md:mx-0">
                        The world's first AR-powered language learning platform for kids. Point your camera, learn a word!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center md:justify-start pt-4">
                        <Link 
                            to="/register" 
                            className="px-6 md:px-8 py-4 bg-secondary hover:bg-secondary-dark text-white font-black text-base md:text-lg rounded-2xl shadow-xl border-b-4 border-secondary-dark active:border-b-0 active:translate-y-1 transition-all min-h-[56px] flex items-center justify-center"
                        >
                            START LEARNING
                        </Link>
                        <Link 
                            to="/learn-ar" 
                            className="px-6 md:px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-700 font-black text-base md:text-lg rounded-2xl shadow-xl border-b-4 border-neutral-200 active:border-b-0 active:translate-y-1 transition-all min-h-[56px] flex items-center justify-center"
                        >
                            TRY DEMO
                        </Link>
                    </div>
                </div>

                <div className="flex-1 relative w-full max-w-md md:max-w-none">
                    <div className="relative z-10 bg-white p-3 md:p-4 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
                        <img
                            src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop"
                            alt="Kid learning"
                            className="rounded-2xl w-full object-cover h-64 md:h-80 lg:h-96"
                        />
                        <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-accent p-3 md:p-4 rounded-2xl shadow-lg animate-bounce">
                            <LionIcon className="w-10 h-10 md:w-14 md:h-14" />
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl -z-10 transform scale-110"></div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 md:p-6 text-center text-neutral-400 font-bold text-sm flex items-center justify-center gap-1">
                <span>© 2024 EduAR Platform. Made with</span>
                <HeartIcon className="w-4 h-4 text-red-400" />
                <span>for Kids.</span>
            </footer>
        </div>
    );
};
