import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-light/30 to-secondary-light/30 flex flex-col">
            {/* Navbar */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                        🎓
                    </div>
                    <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
                </div>
                <div className="flex gap-4">
                    <Link to="/login" className="px-6 py-2 font-bold text-neutral-600 hover:text-primary transition-colors">
                        Log in
                    </Link>
                    <Link to="/register" className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 max-w-7xl mx-auto gap-12">
                <div className="flex-1 text-center md:text-left space-y-6">
                    <h1 className="text-5xl md:text-7xl font-black text-neutral-800 leading-tight">
                        Learn Languages <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                            with Magic! ✨
                        </span>
                    </h1>
                    <p className="text-xl text-neutral-500 font-medium max-w-lg mx-auto md:mx-0">
                        The world's first AR-powered language learning platform for kids. Point your camera, learn a word!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                        <Link to="/register" className="px-8 py-4 bg-secondary hover:bg-secondary-dark text-white font-black text-lg rounded-2xl shadow-xl border-b-4 border-secondary-dark active:border-b-0 active:translate-y-1 transition-all">
                            START LEARNING
                        </Link>
                        <Link to="/learn-ar" className="px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-700 font-black text-lg rounded-2xl shadow-xl border-b-4 border-neutral-200 active:border-b-0 active:translate-y-1 transition-all">
                            TRY DEMO
                        </Link>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <div className="relative z-10 bg-white p-4 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
                        <img
                            src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop"
                            alt="Kid learning"
                            className="rounded-2xl w-full object-cover h-80 md:h-96"
                        />
                        <div className="absolute -bottom-6 -right-6 bg-accent p-4 rounded-2xl shadow-lg animate-bounce">
                            <span className="text-4xl">🦁</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl -z-10 transform scale-110"></div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-6 text-center text-neutral-400 font-bold text-sm">
                © 2024 EduAR Platform. Made with ❤️ for Kids.
            </footer>
        </div>
    );
};
